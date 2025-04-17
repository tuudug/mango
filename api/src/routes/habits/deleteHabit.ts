import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors";

export const deleteHabit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const habitId = req.params.id;

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

    if (!habitId) {
      return next(new BadRequestError("Habit ID is required in the URL path"));
    }

    const { error, count } = await supabase
      .from("manual_habits")
      .delete()
      .eq("id", habitId)
      .eq("user_id", userId); // RLS also enforces this

    if (error) {
      console.error("Supabase error deleting habit:", error);
      return next(
        new InternalServerError("Failed to delete habit due to database error.")
      );
    }

    if (count === 0) {
      // Habit not found for this user
      console.warn(
        `Delete attempt failed: Habit ${habitId} not found for user ${userId}`
      );
      return next(new NotFoundError("Habit not found or access denied"));
    }

    res.status(204).send(); // Success, no content
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in deleteHabit handler:", err);
    next(err);
  }
};
