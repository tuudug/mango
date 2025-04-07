import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs"; // Import dayjs for date validation

export const deleteHabitEntryByDate = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const { habitId, entryDate } = req.query; // Get params from query string

  if (!userId || !supabase) {
    res.status(401).json({
      error: "User not authenticated properly or Supabase client missing",
    });
    return;
  }

  // Validate input
  if (!habitId || typeof habitId !== "string") {
    res.status(400).json({ error: "habitId query parameter is required" });
    return;
  }
  if (
    !entryDate ||
    typeof entryDate !== "string" ||
    !dayjs(entryDate, "YYYY-MM-DD", true).isValid()
  ) {
    res
      .status(400)
      .json({
        error: "entryDate query parameter is required in YYYY-MM-DD format",
      });
    return;
  }

  try {
    // Delete the entry matching user_id, habit_id, and entry_date
    const { error, count } = await supabase
      .from("manual_habit_entries")
      .delete()
      .eq("user_id", userId) // Ensure user owns the entry
      .eq("habit_id", habitId)
      .eq("entry_date", entryDate);

    if (error) {
      console.error("Error deleting habit entry by date:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    if (count === 0) {
      // If no rows were deleted, it means the entry didn't exist for that date/habit/user
      console.warn(
        `Delete attempt failed: Habit entry for habit ${habitId} on ${entryDate} not found for user ${userId}`
      );
      // It's debatable whether this should be 404 or 204 (idempotency).
      // Let's return 404 to indicate the specific entry wasn't found for deletion.
      res
        .status(404)
        .json({
          error: "Habit entry not found for the specified habit and date",
        });
      return;
    }

    // Successfully deleted
    res.status(204).send();
  } catch (err) {
    console.error("Unexpected error deleting habit entry by date:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
