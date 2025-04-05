import { Response } from "express";
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs"; // Use dayjs for date validation

export const getHabitEntries = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client

  // Extract and validate query parameters
  const { startDate, endDate, habitId } = req.query;

  if (!userId || !supabase) {
    // Check for client
    res
      .status(401)
      .json({
        error: "User not authenticated properly or Supabase client missing",
      });
    return;
  }

  // Validate dates
  if (
    !startDate ||
    !endDate ||
    typeof startDate !== "string" ||
    typeof endDate !== "string"
  ) {
    res.status(400).json({
      error:
        "Missing or invalid startDate or endDate query parameters (YYYY-MM-DD)",
    });
    return;
  }
  if (
    !dayjs(startDate, "YYYY-MM-DD", true).isValid() ||
    !dayjs(endDate, "YYYY-MM-DD", true).isValid()
  ) {
    res.status(400).json({
      error: "Invalid date format for startDate or endDate. Use YYYY-MM-DD.",
    });
    return;
  }
  // Optional: Validate habitId if provided
  if (habitId && typeof habitId !== "string") {
    res.status(400).json({ error: "Invalid habitId query parameter." });
    return;
  }

  try {
    // Use the request-scoped 'supabase' client
    let query = supabase
      .from("manual_habit_entries")
      .select("id, habit_id, entry_date, completed, created_at") // Select specific columns
      .eq("user_id", userId) // RLS also enforces this, but good practice
      .gte("entry_date", startDate) // Greater than or equal to start date
      .lte("entry_date", endDate); // Less than or equal to end date

    // Optionally filter by a specific habit ID
    if (habitId) {
      query = query.eq("habit_id", habitId);
    }

    query = query.order("entry_date", { ascending: false }); // Order by date descending

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching habit entries:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error("Unexpected error fetching habit entries:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};
