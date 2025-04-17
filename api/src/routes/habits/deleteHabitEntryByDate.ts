import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs";
import {
  InternalServerError,
  ValidationError,
  NotFoundError,
} from "../../utils/errors";

export const deleteHabitEntryByDate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const { habitId, entryDate } = req.query;

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

    // Validate input
    if (!habitId || typeof habitId !== "string") {
      return next(
        new ValidationError(
          "habitId query parameter is required and must be a string"
        )
      );
    }
    if (
      !entryDate ||
      typeof entryDate !== "string" ||
      !dayjs(entryDate, "YYYY-MM-DD", true).isValid()
    ) {
      return next(
        new ValidationError(
          "entryDate query parameter is required in YYYY-MM-DD format"
        )
      );
    }

    const { error, count } = await supabase
      .from("manual_habit_entries")
      .delete()
      .eq("user_id", userId)
      .eq("habit_id", habitId)
      .eq("entry_date", entryDate);

    if (error) {
      console.error("Supabase error deleting habit entry by date:", error);
      return next(
        new InternalServerError(
          "Failed to delete habit entry by date due to database error."
        )
      );
    }

    if (count === 0) {
      console.warn(
        `Delete attempt failed: Habit entry for habit ${habitId} on ${entryDate} not found for user ${userId}`
      );
      return next(
        new NotFoundError(
          "Habit entry not found for the specified habit and date"
        )
      );
    }

    // Successfully deleted
    res.status(204).send();
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in deleteHabitEntryByDate handler:", err);
    next(err);
  }
};
