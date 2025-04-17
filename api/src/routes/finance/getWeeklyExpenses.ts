import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { isValid, format } from "date-fns"; // Keep format and isValid
import { parseISO } from "date-fns/parseISO"; // Import parseISO specifically
import {
  InternalServerError,
  BadRequestError,
  ValidationError,
} from "../../utils/errors"; // Import custom errors

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
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  // --- Input Validation ---
  if (
    !startDate ||
    !endDate ||
    typeof startDate !== "string" ||
    typeof endDate !== "string"
  ) {
    return next(
      new BadRequestError(
        "startDate and endDate query parameters are required."
      )
    );
  }

  const parsedStartDate = parseISO(startDate);
  const parsedEndDate = parseISO(endDate);

  if (!isValid(parsedStartDate) || !isValid(parsedEndDate)) {
    return next(
      new ValidationError("Invalid date format. Please use YYYY-MM-DD.")
    );
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
      console.error(
        `Supabase error fetching weekly finance entries for user ${userId}:`,
        error
      );
      return next(
        new InternalServerError("Failed to fetch weekly finance entries")
      );
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
