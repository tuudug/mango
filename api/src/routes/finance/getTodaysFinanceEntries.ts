import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { formatInTimeZone } from "date-fns-tz"; // Import timezone formatter
import { updateQuestProgress } from "../../services/questService"; // Import quest service
import { InternalServerError } from "../../utils/errors"; // Import custom errors

// Define type for finance entry (can be shared)
interface FinanceEntry {
  id: string;
  entry_date: string; // Stored as date, retrieved as string
  amount: number;
  description: string | null;
  created_at: string; // Stored as timestamptz, retrieved as string
}

// Define type for finance settings (can be shared)
interface FinanceSettings {
  id: string;
  user_id: string;
  currency: string | null;
  daily_allowance_goal: number | null;
  salary_schedule: any | null; // Adjust 'any' if structure is known
  current_balance: number | null;
  created_at: string;
  updated_at: string;
}

export const getTodaysFinanceEntries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client

  if (!userId || !supabase) {
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  try {
    // Get timezone from header, default to UTC if not provided or invalid
    const userTimezone = (req.headers["x-user-timezone"] as string) || "UTC";
    let validatedTimezone = "UTC";
    try {
      // Basic validation: Check if timezone is likely valid using Intl API
      Intl.DateTimeFormat(undefined, { timeZone: userTimezone });
      validatedTimezone = userTimezone;
    } catch (e) {
      console.warn(
        `Invalid timezone received: ${userTimezone}, defaulting to UTC.`
      );
    }

    // Calculate today's date string in the user's timezone
    const todayDateString = formatInTimeZone(
      new Date(), // Use current date/time
      validatedTimezone,
      "yyyy-MM-dd"
    );

    // Fetch today's entries
    const { data: entriesData, error: entriesError } = await supabase
      .from("manual_finance_entries")
      .select("id, entry_date, amount, description, created_at")
      .eq("user_id", userId)
      .eq("entry_date", todayDateString); // Filter for today's date

    if (entriesError) {
      console.error(
        `Supabase error fetching today's finance entries for user ${userId}:`,
        entriesError
      );
      return next(
        new InternalServerError("Failed to fetch today's finance entries")
      );
    }

    const entries: FinanceEntry[] = entriesData || [];

    // Fetch finance settings (needed for allowance goal)
    const { data: settingsData, error: settingsError } = await supabase
      .from("manual_finance_settings")
      .select("daily_allowance_goal")
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle as settings might not exist

    if (settingsError) {
      console.error(
        `Supabase error fetching finance settings for user ${userId}:`,
        settingsError
      );
      // Don't throw, proceed without settings if necessary, quest update will handle null allowance
    }

    const allowance = settingsData?.daily_allowance_goal ?? null; // Default to null if no settings

    console.log(
      `Fetched ${entries.length} finance entries for user ${userId} for date ${todayDateString}. Allowance: ${allowance}`
    );

    // Send response first
    res.status(200).json(entries);

    // --- Trigger Quest Progress Update ---
    if (allowance !== null) {
      // Calculate total spent today
      const totalSpentToday = entries.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );

      updateQuestProgress(
        userId,
        "finance_under_allowance",
        { date: todayDateString, spent: totalSpentToday, allowance: allowance },
        validatedTimezone, // Use the validated timezone
        supabase // Pass the request-scoped client
      ).catch((questError) => {
        // Log errors from quest progress update, but don't fail the original request
        console.error(
          `[Quest Progress Update Error] Failed after fetching finance entries for date ${todayDateString}:`,
          questError
        );
      });
    } else {
      console.log(
        `[Quest Progress Update] Skipping finance_under_allowance check for ${todayDateString} as allowance goal is not set.`
      );
    }
  } catch (error) {
    console.error("Error in getTodaysFinanceEntries handler:", error);
    // Ensure response is sent even if quest update call setup fails
    if (!res.headersSent) {
      next(error); // Pass error to the global error handler if response not sent
    } else {
      // If response was already sent, we can't use next() anymore, just log
      console.error(
        "Error occurred after response sent in getTodaysFinanceEntries:",
        error
      );
    }
  }
};
