import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { format, isValid } from "date-fns"; // Keep format and isValid
import { parseISO } from "date-fns/parseISO"; // Import parseISO specifically
import { InternalServerError, ValidationError } from "../../utils/errors"; // Import custom errors

// Define type for finance entry (can be shared)
interface FinanceEntry {
  id: string;
  entry_date: string; // Stored as date, retrieved as string
  amount: number;
  description: string | null;
  created_at: string; // Stored as timestamptz, retrieved as string
}

export const addFinanceEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  // Destructure optional entry_date from body
  const { amount, description, entry_date } = req.body;

  if (!userId || !supabase) {
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  // --- Input Validation ---
  if (typeof amount !== "number" || amount < 0) {
    return next(
      new ValidationError("Invalid amount: must be a non-negative number.")
    );
  }
  if (description !== null && typeof description !== "string") {
    return next(new ValidationError("Invalid description format."));
  }

  let dateToUse = format(new Date(), "yyyy-MM-dd"); // Default to today
  if (entry_date) {
    if (typeof entry_date !== "string") {
      return next(
        new ValidationError("Invalid entry_date format (must be string).")
      );
    }
    const parsedDate = parseISO(entry_date); // Expect YYYY-MM-DD string
    if (!isValid(parsedDate)) {
      return next(
        new ValidationError("Invalid entry_date format (must be YYYY-MM-DD).")
      );
    }
    // Re-format to ensure consistency, although parseISO should handle it
    dateToUse = format(parsedDate, "yyyy-MM-dd");
  }
  // --- End Validation ---

  try {
    const newEntry = {
      user_id: userId,
      entry_date: dateToUse, // Use validated or default date
      amount: amount,
      description: description || null, // Ensure null if empty/undefined
    };

    const { data, error } = await supabase
      .from("manual_finance_entries")
      .insert(newEntry)
      .select() // Select the newly created row
      .single(); // Expecting a single row back

    if (error) {
      console.error(
        `Supabase error adding finance entry for user ${userId}:`,
        error
      );
      return next(new InternalServerError("Failed to add finance entry"));
    }

    if (!data) {
      // This case should ideally not happen if insert was successful and .single() was used
      console.error(
        `Finance entry data unexpectedly null after insert for user ${userId}`
      );
      return next(
        new InternalServerError("Failed to retrieve finance entry after adding")
      );
    }

    console.log(
      `Added finance entry for user ${userId} for date ${dateToUse}` // Log correct date
    );
    // Return the newly created entry
    res.status(201).json(data as FinanceEntry);
  } catch (error) {
    console.error("Error in addFinanceEntry handler:", error);
    next(error); // Pass error to the global error handler
  }
};
