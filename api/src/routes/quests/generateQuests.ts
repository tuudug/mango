import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase";
import { generateQuestsForUser } from "../../services/questService";
import {
  isBefore,
  startOfDay,
  addDays,
  // nextDay, // Removed unused import
  setHours,
  // Day, // Removed unused import
} from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz"; // Corrected import names

export async function generateQuests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase as AuthenticatedRequest["supabase"];
  const { type } = req.body as { type?: "daily" | "weekly" };
  const userTimezone = req.headers["x-user-timezone"] as string | undefined;

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!type || (type !== "daily" && type !== "weekly")) {
    res.status(400).json({
      message: "Invalid request body: 'type' must be 'daily' or 'weekly'.",
    });
    return;
  }

  if (!userTimezone) {
    // Fallback or error? For now, error. Frontend should always send it.
    res.status(400).json({ message: "Missing X-User-Timezone header." });
    return;
  }

  try {
    // 1. Fetch User Quest State
    const { data: questState, error: stateFetchError } = await supabase
      .from("user_quest_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (stateFetchError && stateFetchError.code !== "PGRST116") {
      console.error("Error fetching user quest state:", stateFetchError);
      return next(new Error("Failed to fetch quest generation state."));
    }

    // 2. Check Timing Rules based on User's Timezone
    const nowUtc = new Date();
    const nowInUserTz = toZonedTime(nowUtc, userTimezone); // Use toZonedTime
    const startOfTodayUserTz = startOfDay(nowInUserTz);

    let canGenerate = false;
    let lastGeneratedAt: Date | null = null;

    if (type === "daily") {
      lastGeneratedAt = questState?.last_daily_generated_at
        ? fromZonedTime(questState.last_daily_generated_at, "UTC") // DB stores in UTC, convert from UTC string
        : null;
      const lastGeneratedInUserTz = lastGeneratedAt
        ? toZonedTime(lastGeneratedAt, userTimezone) // Convert the UTC date to user's TZ
        : null;

      // Allow if never generated OR if the last generation was before the start of today in user's timezone
      if (
        !lastGeneratedInUserTz ||
        isBefore(lastGeneratedInUserTz, startOfTodayUserTz)
      ) {
        canGenerate = true;
      }
    } else {
      // weekly
      // Weekly reset logic: Allow if never generated OR if current time is past the next allowed reset time.
      // next_weekly_reset_allowed_at should store the specific time (e.g., Sunday 8 PM user time) in UTC.
      // We need to calculate and store this value first. For now, let's use a simpler check:
      // Allow if never generated OR if last generation was before the *previous* Sunday 8 PM.
      // A more robust implementation would store and check against `next_weekly_reset_allowed_at`.

      lastGeneratedAt = questState?.last_weekly_generated_at
        ? fromZonedTime(questState.last_weekly_generated_at, "UTC") // DB stores in UTC
        : null;

      // Simplified check: Allow if never generated or if last generation was > 7 days ago.
      // TODO: Implement proper weekly reset based on a specific day/time using `next_weekly_reset_allowed_at`.
      if (!lastGeneratedAt || isBefore(lastGeneratedAt, addDays(nowUtc, -7))) {
        canGenerate = true;
        // If generating weekly, calculate and store next reset time (e.g., next Sunday 8 PM in user TZ, converted to UTC)
        // const sundayIndex = 0; // 0 for Sunday
        // const nextResetUserTz = setHours(nextDay(nowInUserTz, sundayIndex), 20); // Find next Sunday, set time to 8 PM
        // const nextResetUtc = fromZonedTime(nextResetUserTz, userTimezone); // Convert user TZ time to UTC Date object
        // Need to update user_quest_state with this `nextResetUtc.toISOString()` value later in storeGeneratedQuests.
      }
    }

    if (!canGenerate) {
      const message =
        type === "daily"
          ? "Daily quests can only be generated once per day."
          : "Weekly quests reset is not available yet."; // Improve weekly message later
      res.status(403).json({ message });
      return;
    }

    // 3. Delete Existing 'available' Quests of the specified type
    console.log(
      `Deleting existing 'available' ${type} quests for user ${userId}...`
    );
    const { error: deleteError } = await supabase
      .from("quests")
      .delete()
      .eq("user_id", userId)
      .eq("type", type)
      .eq("status", "available");

    if (deleteError) {
      console.error(`Error deleting available ${type} quests:`, deleteError);
      return next(new Error(`Failed to clear previous ${type} quests.`));
    }

    // 4. Call Generation Service
    const generationResult = await generateQuestsForUser(
      userId,
      type,
      supabase
    );

    if (!generationResult.success) {
      res.status(500).json({
        message:
          generationResult.message || `Failed to generate ${type} quests.`,
        error: generationResult.error,
      });
      return;
    }

    // 5. Return Success Response
    res.status(200).json({
      success: true,
      message: generationResult.message,
      generatedQuests: generationResult.generatedQuests,
    });
  } catch (error) {
    console.error(
      `Unexpected error in generateQuests handler (${type}):`,
      error
    );
    next(error);
  }
}
