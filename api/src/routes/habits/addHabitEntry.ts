import { Response, NextFunction } from "express"; // Import NextFunction
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs";
import { updateQuestProgress } from "../../services/questService";
import {
  ValidationError,
  InternalServerError,
  ConflictError, // For unique constraint
} from "../../utils/errors";

// Define expected request body structure
interface AddHabitEntryRequestBody {
  habit_id: string;
  entry_date: string; // Expecting YYYY-MM-DD format
  // 'completed' defaults to true in the database, so not needed here unless we want to allow false entries
}

export const addHabitEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const { habit_id, entry_date }: AddHabitEntryRequestBody = req.body;
  const userTimezone = (req.headers["x-user-timezone"] as string) || "UTC";

  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(
        new InternalServerError(
          "User ID or Supabase client missing from request."
        )
      );
    }

    // Basic validation
    if (!habit_id || !entry_date) {
      return next(
        new ValidationError("Missing required fields: habit_id, entry_date")
      );
    }
    if (typeof habit_id !== "string" || typeof entry_date !== "string") {
      return next(
        new ValidationError("Invalid type for habit_id or entry_date")
      );
    }
    if (!dayjs(entry_date, "YYYY-MM-DD", true).isValid()) {
      return next(
        new ValidationError(
          "Invalid date format for entry_date. Use YYYY-MM-DD."
        )
      );
    }

    let existingData: any = null;
    let data: any = null;
    let error: any = null;

    // Use a try/catch specifically for the insert operation to handle unique constraint
    try {
      const insertResult = await supabase
        .from("manual_habit_entries")
        .insert({
          user_id: userId,
          habit_id: habit_id,
          entry_date: entry_date,
        })
        .select()
        .single();

      data = insertResult.data;
      error = insertResult.error;
    } catch (insertErr) {
      // Catch potential errors during the insert itself
      error = insertErr;
    }

    if (error) {
      if (error.code === "23505") {
        // Unique constraint violation
        console.warn(
          `Add entry failed: Unique constraint violation for habit ${habit_id} on date ${entry_date} for user ${userId}. Fetching existing.`
        );
        const { data: fetchedExistingData, error: fetchError } = await supabase
          .from("manual_habit_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("habit_id", habit_id)
          .eq("entry_date", entry_date)
          .maybeSingle();

        if (fetchError) {
          console.error(
            "Error fetching existing entry after unique violation:",
            fetchError
          );
          return next(
            new InternalServerError(
              "Failed to fetch existing entry after conflict."
            )
          );
        }
        if (!fetchedExistingData) {
          // This case is unlikely if 23505 occurred, but handle defensively
          console.error(
            "Unique violation occurred but could not fetch existing entry."
          );
          return next(
            new ConflictError(
              "Habit already logged for this date, but failed to retrieve existing record."
            )
          );
        }
        existingData = fetchedExistingData;
      } else {
        // Other Supabase error during insert
        console.error("Supabase error adding habit entry:", error);
        return next(
          new InternalServerError(
            "Failed to add habit entry due to database error."
          )
        );
      }
    }

    // Determine the entry data to use for quest progress
    const entryForQuest = data || existingData;

    // Send response first
    if (data) {
      res.status(201).json(data); // Send back the created entry
    } else if (existingData) {
      res.status(200).json(existingData); // Send back the existing entry
    } else {
      // Should not happen if error handling is correct, but as a safeguard
      console.error(
        "Error state: No data and no existingData after addHabitEntry logic."
      );
      return next(
        new InternalServerError("Failed to determine habit entry status.")
      );
    }

    // --- Background Task: Update Quest Progress ---
    // Run this after the response has been sent
    if (entryForQuest) {
      updateQuestProgress(
        userId,
        "habit_check",
        {
          habitId: entryForQuest.habit_id,
          entryDate: entryForQuest.entry_date,
        },
        userTimezone,
        supabase // Pass the request-scoped client
      ).catch((questError) => {
        // Log error but don't crash the main request flow
        console.error(
          `[Background Quest Update Error] Failed after adding/confirming habit entry ${entryForQuest.id}:`,
          questError
        );
      });
    }
  } catch (err) {
    // Catch any unexpected errors and pass to the global handler
    console.error("Unexpected error in addHabitEntry handler:", err);
    next(err);
  }
};
