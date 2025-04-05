import { Response } from "express";
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth";

export const deleteHabitEntry = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const entryId = req.params.entryId; // Get entryId from URL parameter

  if (!userId || !supabase) {
    // Check for client
    res
      .status(401)
      .json({
        error: "User not authenticated properly or Supabase client missing",
      });
    return;
  }

  if (!entryId) {
    res
      .status(400)
      .json({ error: "Habit entry ID is required in the URL path" });
    return;
  }

  try {
    // Use the request-scoped 'supabase' client
    const { error, count } = await supabase
      .from("manual_habit_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId); // Crucial security check (RLS also enforces this)

    if (error) {
      console.error("Error deleting habit entry:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    if (count === 0) {
      // If no rows were deleted, it means the entry didn't exist or didn't belong to the user
      console.warn(
        `Delete attempt failed: Habit entry ${entryId} not found for user ${userId}`
      );
      res.status(404).json({ error: "Habit entry not found or access denied" });
      return;
    }

    res.status(204).send(); // No content on successful deletion
  } catch (err) {
    console.error("Unexpected error deleting habit entry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
