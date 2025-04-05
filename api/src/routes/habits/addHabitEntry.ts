import { Response } from "express";
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs"; // Use dayjs for date validation

// Define expected request body structure
interface AddHabitEntryRequestBody {
  habit_id: string;
  entry_date: string; // Expecting YYYY-MM-DD format
  // 'completed' defaults to true in the database, so not needed here unless we want to allow false entries
}

export const addHabitEntry = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const { habit_id, entry_date }: AddHabitEntryRequestBody = req.body;

  if (!userId || !supabase) {
    // Check for client
    res.status(401).json({
      error: "User not authenticated properly or Supabase client missing",
    });
    return;
  }

  // Basic validation
  if (!habit_id || !entry_date) {
    res
      .status(400)
      .json({ error: "Missing required fields: habit_id, entry_date" });
    return;
  }
  if (typeof habit_id !== "string" || typeof entry_date !== "string") {
    res.status(400).json({ error: "Invalid type for habit_id or entry_date" });
    return;
  }
  if (!dayjs(entry_date, "YYYY-MM-DD", true).isValid()) {
    res
      .status(400)
      .json({ error: "Invalid date format for entry_date. Use YYYY-MM-DD." });
    return;
  }

  try {
    // Use the request-scoped 'supabase' client
    const { data, error } = await supabase
      .from("manual_habit_entries")
      .insert({
        user_id: userId, // RLS policy will check if auth.uid() matches this
        habit_id: habit_id,
        entry_date: entry_date,
        // completed defaults to true
      })
      .select() // Return the newly created entry
      .single(); // Expect only one row back

    if (error) {
      // Handle potential unique constraint violation for 'once_daily' habits
      if (error.code === "23505") {
        // PostgreSQL unique violation error code
        console.warn(
          `Add entry failed: Unique constraint violation for habit ${habit_id} on date ${entry_date} for user ${userId}. Likely a 'once_daily' habit already logged.`
        );
        // It might be better to return the existing entry instead of an error
        // Let's try fetching the existing entry using the request-scoped client
        const { data: existingData, error: fetchError } = await supabase
          .from("manual_habit_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("habit_id", habit_id)
          .eq("entry_date", entry_date)
          .maybeSingle(); // Use maybeSingle in case it was deleted concurrently

        if (fetchError || !existingData) {
          console.error(
            "Error fetching existing entry after unique violation:",
            fetchError
          );
          res.status(409).json({
            error:
              "Habit already logged for this date (unique constraint violation).",
          });
        } else {
          // Return the existing entry with a 200 OK status, indicating it was already there
          res.status(200).json(existingData);
        }
      } else {
        console.error("Error adding habit entry:", error);
        res.status(500).json({ error: error.message });
      }
      return;
    }

    res.status(201).json(data); // Send back the created entry
  } catch (err) {
    console.error("Unexpected error adding habit entry:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
