import { Response } from "express";
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth";

interface UpdateHabitRequestBody {
  name?: string;
  type?: "positive" | "negative";
  reminder_time?: string | null; // Allow setting to null
  log_type?: "once_daily" | "multiple_daily";
}

export const updateHabit = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const habitId = req.params.id;
  const { name, type, reminder_time, log_type }: UpdateHabitRequestBody =
    req.body;

  if (!userId || !supabase) {
    // Check for client
    res
      .status(401)
      .json({
        error: "User not authenticated properly or Supabase client missing",
      });
    return;
  }

  if (!habitId) {
    res.status(400).json({ error: "Habit ID is required in the URL path" });
    return;
  }

  // Construct update object only with provided fields
  const updateData: Partial<
    UpdateHabitRequestBody & { reminder_time: string | null }
  > = {};
  if (name !== undefined) updateData.name = name;
  if (type !== undefined) {
    if (type !== "positive" && type !== "negative") {
      res.status(400).json({
        error: "Invalid habit type. Must be 'positive' or 'negative'.",
      });
      return;
    }
    updateData.type = type;
  }
  // Allow setting reminder_time to null explicitly
  if (reminder_time !== undefined) updateData.reminder_time = reminder_time;
  if (log_type !== undefined) {
    if (log_type !== "once_daily" && log_type !== "multiple_daily") {
      res.status(400).json({
        error: "Invalid log type. Must be 'once_daily' or 'multiple_daily'.",
      });
      return;
    }
    updateData.log_type = log_type;
  }

  if (Object.keys(updateData).length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }

  try {
    // Use the request-scoped 'supabase' client
    const { data, error } = await supabase
      .from("manual_habits")
      .update(updateData)
      .eq("id", habitId)
      .eq("user_id", userId) // Crucial security check (RLS also enforces this)
      .select()
      .single();

    if (error) {
      // Handle potential error if row doesn't exist or doesn't match user_id
      if (error.code === "PGRST116") {
        // PostgREST error code for "Matching row not found"
        console.error(
          `Update failed: Habit ${habitId} not found for user ${userId}`
        );
        res.status(404).json({ error: "Habit not found or access denied" });
      } else {
        console.error("Error updating habit:", error);
        res.status(500).json({ error: error.message });
      }
      return;
    }

    if (!data) {
      // Should be caught by PGRST116, but as a fallback
      res.status(404).json({ error: "Habit not found after update attempt" });
      return;
    }

    res.status(200).json(data); // Send back the updated habit
  } catch (err) {
    console.error("Unexpected error updating habit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
