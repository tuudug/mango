import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
// import { format } from "date-fns"; // Replaced by date-fns-tz
import { formatInTimeZone } from "date-fns-tz"; // Import timezone formatter

// Define type for finance entry (can be shared)
interface FinanceEntry {
  id: string;
  entry_date: string; // Stored as date, retrieved as string
  amount: number;
  description: string | null;
  created_at: string; // Stored as timestamptz, retrieved as string
}

export const getTodaysFinanceEntries = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
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
      new Date(),
      validatedTimezone,
      "yyyy-MM-dd"
    );

    const { data, error } = await supabase
      .from("manual_finance_entries")
      .select("id, entry_date, amount, description, created_at")
      .eq("user_id", userId)
      .eq("entry_date", todayDateString) // Filter for today's date
      .order("created_at", { ascending: false }); // Order by creation time, newest first

    if (error) {
      console.error("Error fetching today's finance entries:", error);
      throw error; // Let error handler catch it
    }

    const entries: FinanceEntry[] = data || [];

    console.log(
      `Fetched ${entries.length} finance entries for user ${userId} for date ${todayDateString}`
    );
    res.status(200).json(entries);
  } catch (error) {
    console.error("Error in getTodaysFinanceEntries handler:", error);
    next(error); // Pass error to the global error handler
  }
};
