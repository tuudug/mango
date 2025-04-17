import { Response } from "express";
// Remove the global supabase import, we'll use the request-scoped one
// import { supabase } from "../../supabaseClient";
import { AuthenticatedRequest } from "../../middleware/auth";

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
  res: Response
): Promise<void> => {
  const userId = req.userId;
  // Use the request-scoped Supabase client from the middleware
  const supabase = req.supabase;
  const {
    name,
    type,
    reminder_time,
    log_type,
    enable_notification, // Destructure the new field
  }: AddHabitRequestBody = req.body;

  // Ensure middleware attached the client and userId
  if (!userId || !supabase) {
    res.status(401).json({
      error: "User not authenticated properly or Supabase client missing",
    });
    return;
  }

  // Basic validation
  if (!name || !type || !log_type) {
    res
      .status(400)
      .json({ error: "Missing required fields: name, type, log_type" });
    return;
  }
  if (type !== "positive" && type !== "negative") {
    res
      .status(400)
      .json({ error: "Invalid habit type. Must be 'positive' or 'negative'." });
    return;
  }
  if (log_type !== "once_daily" && log_type !== "multiple_daily") {
    res.status(400).json({
      error: "Invalid log type. Must be 'once_daily' or 'multiple_daily'.",
    });
    return;
  }
  // Optional: Add validation for reminder_time format if provided

  try {
    // Use the request-scoped 'supabase' client for the insert
    const { data, error } = await supabase
      .from("manual_habits")
      .insert({
        user_id: userId, // RLS policy will check if auth.uid() matches this
        name: name,
        type: type,
        reminder_time: reminder_time || null, // Ensure null if empty/undefined
        log_type: log_type,
        enable_notification: enable_notification ?? false, // Include and default to false if null/undefined
      })
      .select() // Return the newly created habit
      .single(); // Expect only one row back

    if (error) {
      console.error("Error adding habit:", error);
      // Log the specific RLS error code if possible
      if (error.code === "42501") {
        console.error("RLS Policy Violation Detail:", error.message);
      }
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(201).json(data); // Send back the created habit
  } catch (err) {
    console.error("Unexpected error adding habit:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
