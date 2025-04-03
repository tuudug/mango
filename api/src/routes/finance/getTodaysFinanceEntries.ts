import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { format } from "date-fns"; // To get today's date string

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
    const todayDateString = format(new Date(), "yyyy-MM-dd");

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
