import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { ValidationError, InternalServerError } from "../../utils/errors";

// Define expected request body structure
interface AddHabitRequestBody {
  name: string;
  type: "positive" | "negative";
  reminder_time?: string | null; // Optional, format HH:MM:SS or HH:MM
  log_type: "once_daily" | "multiple_daily";
  enable_notification?: boolean; // Add the missing field
}

export const addHabit = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const {
    name,
    type,
    reminder_time,
    log_type,
    enable_notification,
  }: AddHabitRequestBody = req.body;

  try {
    const userId = req.userId;
    const supabase = req.supabase;

    // Ensure middleware attached the client and userId
    if (!userId || !supabase) {
      // This should technically be caught by auth middleware, but check for safety
      return next(
        new InternalServerError(
          "User ID or Supabase client missing from request."
        )
      );
    }

    // Basic validation
    if (!name || !type || !log_type) {
      return next(
        new ValidationError("Missing required fields: name, type, log_type")
      );
    }
    if (type !== "positive" && type !== "negative") {
      return next(
        new ValidationError(
          "Invalid habit type. Must be 'positive' or 'negative'."
        )
      );
    }
    if (log_type !== "once_daily" && log_type !== "multiple_daily") {
      return next(
        new ValidationError(
          "Invalid log type. Must be 'once_daily' or 'multiple_daily'."
        )
      );
    }
    // Optional: Add validation for reminder_time format if provided

    const { data, error } = await supabase
      .from("manual_habits")
      .insert({
        user_id: userId,
        name: name,
        type: type,
        reminder_time: reminder_time || null,
        log_type: log_type,
        enable_notification: enable_notification ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Supabase error adding habit:", error);
      // Let the generic error handler format the response
      return next(
        new InternalServerError("Failed to add habit due to database error.")
      );
    }

    res.status(201).json(data);
  } catch (err) {
    // Catch any unexpected errors and pass to the global handler
    console.error("Unexpected error in addHabit handler:", err);
    next(err); // Pass the original error for potential specific handling
  }
};
