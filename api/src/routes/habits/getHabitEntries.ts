import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs";
import { InternalServerError, ValidationError } from "../../utils/errors";

export const getHabitEntries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const { startDate, endDate, habitId } = req.query;

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

    // Validate dates
    if (
      !startDate ||
      !endDate ||
      typeof startDate !== "string" ||
      typeof endDate !== "string"
    ) {
      return next(
        new ValidationError(
          "Missing or invalid startDate or endDate query parameters (YYYY-MM-DD)"
        )
      );
    }
    if (
      !dayjs(startDate, "YYYY-MM-DD", true).isValid() ||
      !dayjs(endDate, "YYYY-MM-DD", true).isValid()
    ) {
      return next(
        new ValidationError(
          "Invalid date format for startDate or endDate. Use YYYY-MM-DD."
        )
      );
    }
    // Validate habitId if provided
    if (habitId && typeof habitId !== "string") {
      return next(
        new ValidationError(
          "Invalid habitId query parameter. Must be a string."
        )
      );
    }

    let query = supabase
      .from("manual_habit_entries")
      .select("id, habit_id, entry_date, completed, created_at")
      .eq("user_id", userId)
      .gte("entry_date", startDate as string) // Cast as string after validation
      .lte("entry_date", endDate as string); // Cast as string after validation

    if (habitId) {
      query = query.eq("habit_id", habitId);
    }

    query = query.order("entry_date", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching habit entries:", error);
      return next(
        new InternalServerError(
          "Failed to fetch habit entries due to database error."
        )
      );
    }

    res.status(200).json(data || []);
  } catch (err) {
    // Catch any unexpected errors
    console.error("Unexpected error in getHabitEntries handler:", err);
    next(err);
  }
};
