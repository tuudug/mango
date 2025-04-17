import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
// Database type not strictly needed if not used directly
import { generateQuestsForUser } from "../../services/questService";
import { isBefore, startOfDay, addDays, setHours } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  AuthorizationError, // Use 403 for timing rules
} from "../../utils/errors";

export async function generateQuests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase as AuthenticatedRequest["supabase"];
  const { type } = req.body as { type?: "daily" | "weekly" };
  const userTimezone = req.headers["x-user-timezone"] as string | undefined;

  try {
    const userId = req.user?.id;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    if (!type || (type !== "daily" && type !== "weekly")) {
      return next(
        new BadRequestError(
          "Invalid request body: 'type' must be 'daily' or 'weekly'."
        )
      );
    }

    if (!userTimezone) {
      return next(new BadRequestError("Missing X-User-Timezone header."));
    }

    // 1. Fetch User Quest State
    const { data: questState, error: stateFetchError } = await supabase
      .from("user_quest_state")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Handle case where state doesn't exist yet (PGRST116) - this is okay, means first generation
    if (stateFetchError && stateFetchError.code !== "PGRST116") {
      console.error(
        "Supabase error fetching user quest state:",
        stateFetchError
      );
      return next(
        new InternalServerError("Failed to fetch quest generation state.")
      );
    }

    // 2. Check Timing Rules based on User's Timezone
    const nowUtc = new Date();
    const nowInUserTz = toZonedTime(nowUtc, userTimezone);
    const startOfTodayUserTz = startOfDay(nowInUserTz);

    let canGenerate = false;
    let lastGeneratedAt: Date | null = null;

    if (type === "daily") {
      lastGeneratedAt = questState?.last_daily_generated_at
        ? fromZonedTime(questState.last_daily_generated_at, "UTC")
        : null;
      const lastGeneratedInUserTz = lastGeneratedAt
        ? toZonedTime(lastGeneratedAt, userTimezone)
        : null;

      if (
        !lastGeneratedInUserTz ||
        isBefore(lastGeneratedInUserTz, startOfTodayUserTz)
      ) {
        canGenerate = true;
      }
    } else {
      // weekly
      lastGeneratedAt = questState?.last_weekly_generated_at
        ? fromZonedTime(questState.last_weekly_generated_at, "UTC")
        : null;

      // TODO: Implement proper weekly reset logic
      if (!lastGeneratedAt || isBefore(lastGeneratedAt, addDays(nowUtc, -7))) {
        canGenerate = true;
      }
    }

    if (!canGenerate) {
      const message =
        type === "daily"
          ? "Daily quests can only be generated once per day."
          : "Weekly quests reset is not available yet.";
      // Use AuthorizationError (403) for timing restrictions
      return next(new AuthorizationError(message));
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
      console.error(
        `Supabase error deleting available ${type} quests:`,
        deleteError
      );
      return next(
        new InternalServerError(`Failed to clear previous ${type} quests.`)
      );
    }

    // 4. Call Generation Service
    // The service should handle its own internal errors and return a clear success/failure status
    const generationResult = await generateQuestsForUser(
      userId,
      type,
      supabase
    );

    if (!generationResult.success) {
      // Use InternalServerError as the generation process failed server-side
      console.error(
        `Quest generation service failed for user ${userId} (${type}):`,
        generationResult.error || generationResult.message
      );
      return next(
        new InternalServerError(
          generationResult.message || `Failed to generate ${type} quests.`,
          generationResult.error // Pass potential details
        )
      );
    }

    // 5. Return Success Response
    res.status(200).json({
      success: true,
      message: generationResult.message,
      generatedQuests: generationResult.generatedQuests,
    });
  } catch (error) {
    // Catch unexpected errors
    console.error(
      `Unexpected error in generateQuests handler (${type}):`,
      error
    );
    next(error); // Pass to global error handler
  }
}
