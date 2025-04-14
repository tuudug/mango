import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "https://esm.sh/web-push@3.6.7"; // Use esm.sh for Deno compatibility
import dayjs from "https://esm.sh/dayjs@1.11.10";
import utc from "https://esm.sh/dayjs@1.11.10/plugin/utc";
import timezone from "https://esm.sh/dayjs@1.11.10/plugin/timezone"; // Required for timezone conversions

dayjs.extend(utc);
dayjs.extend(timezone);

interface Habit {
  id: string;
  user_id: string;
  name: string;
  reminder_time: string; // HH:MM format
  user_timezone: string | null; // Timezone from user_settings
}

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Ensure VAPID keys are set in Edge Function environment variables
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL"); // For web-push contact

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !ADMIN_EMAIL) {
  console.error("VAPID keys or Admin Email not set in environment variables.");
  // Consider throwing an error or returning a specific status if critical
} else {
  webpush.setVapidDetails(
    `mailto:${ADMIN_EMAIL}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

Deno.serve(async (req) => {
  try {
    // Use Service Role Key for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // 1. Get current time in UTC
    const nowUtc = dayjs.utc();
    const currentMinuteUtc = nowUtc.format("HH:mm"); // Format as HH:MM for comparison

    console.log(
      `[${nowUtc.toISOString()}] Running reminder check for UTC minute: ${currentMinuteUtc}`
    );

    // 2. Fetch habits with enabled notifications and a reminder time matching the current minute *in the user's timezone*
    // We join with user_settings to get the timezone.
    // We filter directly in the query using timezone conversion.
    // Note: This query might become slow with many users/habits. Consider optimization later.
    const { data: habits, error: habitsError } = await supabaseAdmin
      .from("manual_habits")
      .select(
        `
            id,
            user_id,
            name,
            reminder_time,
            user_settings ( timezone )
          `
      )
      .eq("enable_notification", true)
      .not("reminder_time", "is", null) // Ensure reminder_time is set
      .filter("reminder_time", "eq", currentMinuteUtc); // Initial filter by HH:MM (will be refined below)
    // We cannot directly filter by user's local time in Supabase easily,
    // so we fetch candidates based on HH:MM and filter further in code.

    if (habitsError) {
      console.error("Error fetching habits:", habitsError);
      throw habitsError;
    }

    if (!habits || habits.length === 0) {
      console.log(
        "No habits found with reminders due at this minute (initial check)."
      );
      return new Response(JSON.stringify({ message: "No reminders due." }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${habits.length} potential habit reminders to check.`);

    // Process reminders in parallel
    const reminderPromises = habits.map(async (habit) => {
      // Annoying type workaround because Supabase join typing isn't perfect
      const settings = habit.user_settings as {
        timezone: string | null;
      } | null;
      const userTimezone = settings?.timezone || "UTC"; // Default to UTC if not set

      // Convert current UTC time to user's local time
      const nowUserLocal = nowUtc.tz(userTimezone);
      const currentUserMinuteLocal = nowUserLocal.format("HH:mm");

      // Check if the habit's reminder_time matches the current minute in the user's timezone
      if (habit.reminder_time !== currentUserMinuteLocal) {
        // console.log(`Skipping habit ${habit.id} for user ${habit.user_id}. Local time ${currentUserMinuteLocal} doesn't match reminder ${habit.reminder_time}`);
        return; // Skip if the time doesn't match in the user's timezone
      }

      console.log(
        `Processing reminder for habit '${habit.name}' (ID: ${habit.id}) for user ${habit.user_id} at ${habit.reminder_time} [${userTimezone}]`
      );

      // 3. Fetch user's push subscriptions
      const { data: subscriptions, error: subsError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", habit.user_id);

      if (subsError) {
        console.error(
          `Error fetching subscriptions for user ${habit.user_id}:`,
          subsError
        );
        return; // Skip this reminder if subs fetch fails
      }

      if (!subscriptions || subscriptions.length === 0) {
        console.log(
          `No active push subscriptions found for user ${habit.user_id}.`
        );
        return; // Skip if user has no subscriptions
      }

      // 4. Construct notification payload
      const payload = JSON.stringify({
        title: `🥭 Reminder: ${habit.name}`,
        body: `Time to complete your habit: ${habit.name}!`,
        // Add other data if needed, e.g., URL to open on click
        // data: { url: `/habits/${habit.id}` }
      });

      // 5. Send push notification to each subscription
      const sendPromises = subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, payload);
          console.log(
            `Push notification sent successfully to user ${
              habit.user_id
            }, endpoint: ${sub.endpoint.substring(0, 40)}...`
          );

          // --- Optional: Log to in-app notifications table ---
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
              `Failed to log reminder notification for user ${habit.user_id}, habit ${habit.id}:`,
              logError
            );
          }
          // --- End Optional Log ---
        } catch (error) {
          console.error(
            `Error sending push notification to ${sub.endpoint.substring(
              0,
              40
            )}...:`,
            error
          );
          // Handle specific errors, e.g., 410 Gone (subscription expired/invalid)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(
              `Subscription ${sub.endpoint.substring(
                0,
                40
              )}... is invalid. Deleting.`
            );
            // Delete the invalid subscription from DB
            await supabaseAdmin
              .from("push_subscriptions")
              .delete()
              .eq("endpoint", sub.endpoint);
          }
        }
      });

      await Promise.allSettled(sendPromises); // Wait for all sends for this user to finish/fail
    });

    await Promise.allSettled(reminderPromises); // Wait for all habit reminders to be processed

    console.log("Reminder check finished.");
    return new Response(JSON.stringify({ message: "Reminders processed." }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in Edge Function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
