import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  ValidationError,
  NotFoundError,
} from "../../utils/errors";

interface UpdateHabitRequestBody {
  name?: string;
  type?: "positive" | "negative";
  reminder_time?: string | null; // Allow setting to null
  log_type?: "once_daily" | "multiple_daily";
  enable_notification?: boolean; // Add missing field
}

export const updateHabit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const habitId = req.params.id;
  const updatePayload: UpdateHabitRequestBody = req.body;

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

    // Construct update object only with provided fields, performing validation
    const updateData: Partial<UpdateHabitRequestBody> = {};
    if (updatePayload.name !== undefined) {
      if (
        typeof updatePayload.name !== "string" ||
        updatePayload.name.trim() === ""
      ) {
        return next(new ValidationError("Habit name cannot be empty."));
      }
      updateData.name = updatePayload.name;
    }
    if (updatePayload.type !== undefined) {
      if (
        updatePayload.type !== "positive" &&
        updatePayload.type !== "negative"
      ) {
        return next(
          new ValidationError(
            "Invalid habit type. Must be 'positive' or 'negative'."
          )
        );
      }
      updateData.type = updatePayload.type;
    }
    // Allow setting reminder_time to null explicitly
    if (updatePayload.reminder_time !== undefined) {
      // Optional: Add validation for reminder_time format if needed
      updateData.reminder_time = updatePayload.reminder_time;
    }
    if (updatePayload.log_type !== undefined) {
      if (
        updatePayload.log_type !== "once_daily" &&
        updatePayload.log_type !== "multiple_daily"
      ) {
        return next(
          new ValidationError(
            "Invalid log type. Must be 'once_daily' or 'multiple_daily'."
          )
        );
      }
      updateData.log_type = updatePayload.log_type;
    }
    if (updatePayload.enable_notification !== undefined) {
      if (typeof updatePayload.enable_notification !== "boolean") {
        return next(
          new ValidationError("enable_notification must be a boolean.")
        );
      }
      updateData.enable_notification = updatePayload.enable_notification;
    }

    if (Object.keys(updateData).length === 0) {
      return next(new BadRequestError("No update fields provided"));
    }

    const { data, error } = await supabase
      .from("manual_habits")
      .update(updateData)
      .eq("id", habitId)
      .eq("user_id", userId) // RLS also enforces this
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Matching row not found
        console.warn(
          `Update failed: Habit ${habitId} not found for user ${userId}`
        );
        return next(new NotFoundError("Habit not found or access denied"));
      } else {
        console.error("Supabase error updating habit:", error);
        return next(
          new InternalServerError(
            "Failed to update habit due to database error."
          )
        );
      }
    }

    // data should exist if error is null after .single()
    if (!data) {
      console.error(
        `Update successful according to Supabase (no error), but no data returned for habit ${habitId}.`
      );
      return next(
        new InternalServerError("Habit data missing after successful update.")
      );
    }

    res.status(200).json(data);
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in updateHabit handler:", err);
    next(err);
  }
};
