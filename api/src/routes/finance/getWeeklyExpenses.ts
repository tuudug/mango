import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { isValid, format } from "date-fns"; // Keep format and isValid
import { parseISO } from "date-fns/parseISO"; // Import parseISO specifically

// Define type for the aggregated result
interface WeeklyExpenseSummary {
  date: string; // YYYY-MM-DD
  totalAmount: number;
}

export const getWeeklyExpenses = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const { startDate, endDate } = req.query; // Get dates from query params

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  // --- Input Validation ---
  if (
    !startDate ||
    !endDate ||
    typeof startDate !== "string" ||
    typeof endDate !== "string"
  ) {
    res.status(400).json({
      message: "startDate and endDate query parameters are required.",
    });
    return;
  }

  const parsedStartDate = parseISO(startDate);
  const parsedEndDate = parseISO(endDate);

  if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
    res
      .status(400)
      .json({ message: "Invalid date format. Please use YYYY-MM-DD." });
    return;
  }
  // --- End Validation ---

  try {
    // Fetch entries within the date range
    const { data, error } = await supabase
      .from("manual_finance_entries")
      .select("entry_date, amount")
      .eq("user_id", userId)
      .gte("entry_date", startDate) // Greater than or equal to start date
      .lte("entry_date", endDate); // Less than or equal to end date

    if (error) {
      console.error("Error fetching weekly finance entries:", error);
      throw error;
    }

    // Aggregate expenses by date
    const dailyTotals: Record<string, number> = {};
    if (data) {
      for (const entry of data) {
        const dateStr = entry.entry_date; // Already in YYYY-MM-DD format from DB
        dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + entry.amount;
      }
    }

    // Format the result into the desired array structure
    const result: WeeklyExpenseSummary[] = Object.entries(dailyTotals).map(
      ([date, totalAmount]) => ({
        date,
        totalAmount,
      })
    );

    // Sort by date just in case
    result.sort((a, b) => a.date.localeCompare(b.date));

    console.log(
      `Fetched weekly expense summary for user ${userId} from ${startDate} to ${endDate}`
    );
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in getWeeklyExpenses handler:", error);
    next(error); // Pass error to the global error handler
  }
};
