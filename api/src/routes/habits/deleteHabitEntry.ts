import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors";

export const deleteHabitEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const entryId = req.params.entryId;

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

    if (!entryId) {
      return next(
        new BadRequestError("Habit entry ID is required in the URL path")
      );
    }

    const { error, count } = await supabase
      .from("manual_habit_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId); // RLS also enforces this

    if (error) {
      console.error("Supabase error deleting habit entry:", error);
      return next(
        new InternalServerError(
          "Failed to delete habit entry due to database error."
        )
      );
    }

    if (count === 0) {
      // Entry not found for this user
      console.warn(
        `Delete attempt failed: Habit entry ${entryId} not found for user ${userId}`
      );
      return next(new NotFoundError("Habit entry not found or access denied"));
    }

    res.status(204).send(); // Success, no content
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in deleteHabitEntry handler:", err);
    next(err);
  }
};
