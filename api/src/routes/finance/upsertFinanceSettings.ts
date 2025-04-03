import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

// Define specific type for salary schedule entries (can be shared)
interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

// Type guard to check if an item is a valid SalaryPayment object (can be shared)
function isValidSalaryPayment(item: unknown): item is SalaryPayment {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof (item as SalaryPayment).dayOfMonth === "number" &&
    typeof (item as SalaryPayment).amount === "number"
  );
}

export const upsertFinanceSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const { currency, daily_allowance_goal, salary_schedule } = req.body;

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  // --- Input Validation ---
  // Basic validation for currency (string or null)
  if (currency !== null && typeof currency !== "string") {
    res.status(400).json({ message: "Invalid currency format." });
    return;
  }
  // Basic validation for goal (number or null)
  if (
    daily_allowance_goal !== null &&
    typeof daily_allowance_goal !== "number"
  ) {
    res.status(400).json({ message: "Invalid daily allowance goal format." });
    return;
  }
  // Validate salary_schedule structure
  if (
    salary_schedule !== null &&
    (!Array.isArray(salary_schedule) ||
      !salary_schedule.every(isValidSalaryPayment))
  ) {
    res.status(400).json({ message: "Invalid salary schedule format." });
    return;
  }
  // --- End Validation ---

  try {
    const settingsData = {
      user_id: userId,
      currency: currency, // Use validated value
      daily_allowance_goal: daily_allowance_goal, // Use validated value
      salary_schedule: salary_schedule, // Use validated value
      updated_at: new Date().toISOString(), // Manually set updated_at for upsert
      // current_balance is NOT updated here
    };

    const { error } = await supabase
      .from("manual_finance_settings")
      .upsert(settingsData, { onConflict: "user_id" }); // Upsert based on user_id

    if (error) {
      console.error("Error upserting finance settings:", error);
      throw error; // Let error handler catch it
    }

    console.log(`Upserted finance settings for user ${userId}`);
    // Return 200 OK with the updated settings (optional, or just 204 No Content)
    // Fetching again to ensure we return the potentially defaulted values if needed
    const { data: updatedSettings, error: fetchError } = await supabase
      .from("manual_finance_settings")
      .select(
        "currency, daily_allowance_goal, salary_schedule, current_balance"
      )
      .eq("user_id", userId)
      .single(); // Use single as we expect it to exist now

    if (fetchError || !updatedSettings) {
      console.error("Error fetching settings after upsert:", fetchError);
      // Fallback or handle error - maybe return 204 No Content if fetch fails
      res.status(204).send();
    } else {
      res.status(200).json(updatedSettings);
    }
  } catch (error) {
    console.error("Error in upsertFinanceSettings handler:", error);
    next(error); // Pass error to the global error handler
  }
};
