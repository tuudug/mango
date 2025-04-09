import { Response, Request } from "express"; // Import Request
import { AuthenticatedRequest } from "../../middleware/auth";
import dayjs from "dayjs"; // Use dayjs for date validation
import { updateQuestProgress } from "../../services/questService"; // Import quest service

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
  // Read user timezone from header, default to UTC if not provided
  const userTimezone = (req.headers["x-user-timezone"] as string) || "UTC";

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
    let existingData: any = null; // Declare existingData here
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
        // Assign to the already declared existingData variable
        const { data: fetchedExistingData, error: fetchError } = await supabase
          .from("manual_habit_entries")
          .select("*")
          .eq("user_id", userId)
          .eq("habit_id", habit_id)
          .eq("entry_date", entry_date)
          .maybeSingle(); // Use maybeSingle in case it was deleted concurrently

        if (fetchError || !fetchedExistingData) {
          console.error(
            "Error fetching existing entry after unique violation:",
            fetchError
          );
          res.status(409).json({
            error:
              "Habit already logged for this date (unique constraint violation).",
          });
        } else {
          // Assign the fetched data to existingData
          existingData = fetchedExistingData;
          // Return the existing entry with a 200 OK status, indicating it was already there
          // We will send the response later, after determining entryForQuest
          // res.status(200).json(existingData);
        }
      } else {
        console.error("Error adding habit entry:", error);
        res.status(500).json({ error: error.message });
      }
      return;
    }

    // Determine the entry data to use for quest progress (newly created or existing)
    const entryForQuest = data || existingData; // Use existingData if unique violation occurred

    // Send response first
    if (data) {
      res.status(201).json(data); // Send back the created entry
    } else if (existingData) {
      res.status(200).json(existingData); // Send back the existing entry
    }
    // Don't return here, proceed to update quest progress

    // Call quest progress update in the background (don't await)
    if (entryForQuest) {
      updateQuestProgress(
        userId,
        "habit_check",
        {
          habitId: entryForQuest.habit_id,
          entryDate: entryForQuest.entry_date,
        },
        userTimezone,
        supabase // Pass the request-scoped client
      ).catch((questError) => {
        // Log errors from quest progress update, but don't fail the original request
        console.error(
          `[Quest Progress Update Error] Failed after adding habit entry ${entryForQuest.id}:`,
          questError
        );
      });
    }
  } catch (err) {
    console.error("Unexpected error adding habit entry:", err);
    // Ensure response is sent even if quest update call setup fails
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
};
