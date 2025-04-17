import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { InternalServerError } from "../../utils/errors"; // Import custom errors

// Define specific type for salary schedule entries
interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

// Define a type for the settings data structure
interface FinanceSettings {
  currency: string | null;
  daily_allowance_goal: number | null;
  salary_schedule: SalaryPayment[] | null; // Use specific type
  current_balance: number | null;
}

// Type guard to check if an item is a valid SalaryPayment object
function isValidSalaryPayment(item: unknown): item is SalaryPayment {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as SalaryPayment).dayOfMonth === "number" &&
    typeof (item as SalaryPayment).amount === "number"
  );
}

export const getFinanceSettings = async (
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
    // Fetching potentially unknown JSON, cast carefully later if needed
    const { data, error } = await supabase
      .from("manual_finance_settings")
      .select(
        "currency, daily_allowance_goal, salary_schedule, current_balance"
      )
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle to handle case where user has no settings yet

    if (error) {
      console.error(
        `Supabase error fetching finance settings for user ${userId}:`,
        error
      );
      return next(new InternalServerError("Failed to fetch finance settings"));
    }

    // If no settings found, return default/null values
    // Ensure the fetched data conforms to the type, or provide defaults
    const settings: FinanceSettings = {
      currency: data?.currency ?? "USD", // Default currency
      daily_allowance_goal: data?.daily_allowance_goal ?? null,
      // Validate salary_schedule structure using type guard
      salary_schedule:
        Array.isArray(data?.salary_schedule) &&
        data.salary_schedule.every(isValidSalaryPayment) // Use type guard here
          ? (data.salary_schedule as SalaryPayment[])
          : null,
      current_balance: data?.current_balance ?? null,
    };

    console.log(`Fetched finance settings for user ${userId}`);
    res.status(200).json(settings);
  } catch (error) {
    console.error("Error in getFinanceSettings handler:", error);
    next(error); // Pass error to the global error handler
  }
};
