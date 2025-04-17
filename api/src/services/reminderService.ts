import webpush from "web-push";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc"; // Required for UTC operations
import timezone from "dayjs/plugin/timezone"; // Required for timezone conversions
import { supabaseAdmin } from "../supabaseClient"; // Use the ADMIN client

dayjs.extend(utc);
dayjs.extend(timezone); // Restore timezone plugin usage

// --- VAPID Key Configuration ---
// Ensure these are set in your API environment (e.g., .env file)
const VAPID_PUBLIC_KEY = process.env.VITE_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

let isWebPushConfigured = false;
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !ADMIN_EMAIL) {
  console.error(
    "[ReminderService] VAPID keys or Admin Email not configured in API environment variables. Push notifications will not be sent."
  );
} else {
  try {
    webpush.setVapidDetails(
      `mailto:${ADMIN_EMAIL}`,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    isWebPushConfigured = true;
    console.log("[ReminderService] Web Push configured successfully.");
  } catch (error) {
    console.error(
      "[ReminderService] Error configuring Web Push VAPID details:",
      error
    );
  }
}
// --- End VAPID Configuration ---

// --- Main Reminder Check Function ---
export const checkAndSendReminders = async (): Promise<void> => {
  // This function is triggered every 15 mins by cron (UTC based)
  console.log("[ReminderService] Starting reminder check cycle...");

  try {
    // Fetch ALL enabled habits with a reminder time set using the ADMIN client
    const { data: allEnabledHabits, error: habitsError } = await supabaseAdmin
      .from("manual_habits")
      .select(
        `
          id,
          user_id,
          name,
          reminder_time
        `
      ) // Select necessary fields
      .eq("enable_notification", true)
      .not("reminder_time", "is", null); // Fetch all enabled habits with a time

    if (habitsError) {
      console.error(
        "[ReminderService] Error fetching potential habits:",
        habitsError
      );
      return;
    }

    if (!allEnabledHabits || allEnabledHabits.length === 0) {
      console.log(
        `[ReminderService] No enabled habits with reminder times found.`
      );
      return;
    }

    console.log(
      `[ReminderService] Found ${allEnabledHabits.length} enabled habits with reminder times. Checking user timezones...`
    );

    // Log all fetched habits for debugging
    console.log(
      `[ReminderService] Raw enabled habits fetched:`,
      JSON.stringify(allEnabledHabits, null, 2)
    );

    // Process reminders by checking each habit against the user's local time
    const reminderPromises = allEnabledHabits.map(async (habit) => {
      // Fetch user timezone separately for this habit
      let userTimezone = "UTC"; // Default to UTC
      try {
        // Use ADMIN client to fetch settings too, as this runs outside user context
        const { data: settings, error: settingsError } = await supabaseAdmin
          .from("user_settings")
          .select("timezone")
          .eq("user_id", habit.user_id)
          .single();

        if (settingsError) {
          console.error(
            `[ReminderService] Error fetching timezone for user ${habit.user_id}: ${settingsError.message}. Defaulting to UTC.`
          );
        } else if (settings?.timezone) {
          userTimezone = settings.timezone;
        }
      } catch (fetchError: any) {
        console.error(
          `[ReminderService] Exception fetching timezone for user ${habit.user_id}: ${fetchError.message}. Defaulting to UTC.`
        );
      }

      // Calculate the current time *in the user's timezone*
      const nowUserLocal = dayjs().tz(userTimezone);
      const currentMinuteUserLocal = nowUserLocal.minute();
      // Round down to the current 15-minute interval
      const intervalMinuteUserLocal =
        Math.floor(currentMinuteUserLocal / 15) * 15;
      const currentIntervalTimeUserLocal = nowUserLocal
        .minute(intervalMinuteUserLocal)
        .second(0)
        .millisecond(0)
        .format("HH:mm:ss"); // Format includes seconds

      // Log the comparison details for debugging
      console.log(
        `[ReminderService] Checking Habit ID: ${habit.id}, User: ${habit.user_id}, User TZ: ${userTimezone}. Comparing DB time "${habit.reminder_time}" with calculated local interval "${currentIntervalTimeUserLocal}"`
      );

      // Check: Does the habit's reminder time match the *current* 15-min interval *in the user's timezone*?
      if (habit.reminder_time !== currentIntervalTimeUserLocal) {
        return; // Skip if the user's current interval doesn't match the stored time
      }

      // If we reach here, the time matches!
      console.log(
        `[ReminderService] Time match for user ${habit.user_id} [${userTimezone}]! Processing reminder for habit '${habit.name}' (ID: ${habit.id}) at ${habit.reminder_time}`
      );

      // --- Log to in-app notifications table ---
      // Use ADMIN client here too
      const { error: logError } = await supabaseAdmin
        .from("notifications")
        .insert({
          user_id: habit.user_id,
          type: "habit_reminder",
          title: `Reminder: ${habit.name}`,
          body: `Time to complete your habit: ${habit.name}!`,
          related_entity_id: habit.id,
        });

      if (logError) {
        console.error(
          `[ReminderService] Failed to log reminder notification to DB for user ${habit.user_id}, habit ${habit.id}:`,
          logError
        );
        // Continue to attempt push notification
      } else {
        // console.log(`[ReminderService] Logged reminder to notifications table for user ${habit.user_id}, habit ${habit.id}.`);
      }

      // --- Send Push Notification ---
      if (!isWebPushConfigured) {
        console.warn(
          `[ReminderService] Skipping push notification for job ${habit.id} as Web Push is not configured.`
        );
        return; // Don't proceed if web-push isn't set up
      }

      // Use ADMIN client
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", habit.user_id);

      if (subsError) {
        console.error(
          `[ReminderService] Error fetching subscriptions for user ${habit.user_id}: ${subsError.message}`
        );
        return; // Skip push if subs fetch fails
      }

      if (!subscriptions || subscriptions.length === 0) {
        // console.log(`[ReminderService] No active push subscriptions found for user ${habit.user_id} for habit '${habit.name}'.`);
        return; // No subs to send to
      }

      const payloadString = JSON.stringify({
        title: `🥭 Reminder: ${habit.name}`,
        body: `Time to complete your habit: ${habit.name}!`,
        // data: { url: `/habits/${habit.id}` } // Optional data
      });

      let successfulSends = 0;
      const sendPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        };
        try {
          await webpush.sendNotification(pushSubscription, payloadString);
          successfulSends++;
        } catch (pushError: any) {
          console.error(
            `[ReminderService] Error sending push to ${sub.endpoint.substring(
              0,
              40
            )}... (Habit: ${habit.id}, User: ${habit.user_id}):`,
            pushError.message || pushError
          );
          if (pushError.statusCode === 410 || pushError.statusCode === 404) {
            console.log(
              `[ReminderService] Deleting invalid subscription: ${sub.endpoint.substring(
                0,
                40
              )}...`
            );
            // Use ADMIN client
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      });

      await Promise.allSettled(sendPromises);
      console.log(
        `[ReminderService] Habit ${habit.id} processed. Sent to ${successfulSends}/${subscriptions.length} subscriptions.`
      );
    }); // End map loop

    await Promise.allSettled(reminderPromises);
  } catch (error: any) {
    console.error(
      "[ReminderService] Unexpected error during reminder check:",
      error.message || error
    );
  }

  console.log("[ReminderService] Finished reminder check cycle.");
};
// --- End Main Reminder Check Function ---
