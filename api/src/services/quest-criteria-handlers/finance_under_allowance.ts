import { Database } from "../../types/supabase";
import {
  CriterionCheckFunction,
  CriterionProgressResult,
} from "../questCriteriaRegistry";

// Define the expected structure for the config object for this criterion type
interface FinanceUnderAllowanceConfig {
  // No specific config properties needed for this type currently,
  // but define the interface for consistency and future expansion.
  // e.g., maybe a specific budget category later?
}

// Type guard to check if the config object matches the expected structure
// For now, just checks if it's an object (even empty)
function isFinanceUnderAllowanceConfig(
  config: any
): config is FinanceUnderAllowanceConfig {
  return typeof config === "object" && config !== null;
}

interface FinanceUnderAllowanceActionData {
  date: string; // Date for which the spending applies (e.g., 'YYYY-MM-DD')
  spent: number; // Amount spent on that date
  allowance: number; // Daily allowance goal for that date
}

/**
 * Checks progress for 'finance_under_allowance' criteria.
 * Sets isMetOverride to true if the amount spent is less than or equal to the allowance.
 * Assumes the activation date check has already been performed by the caller.
 */
export const checkCriterionProgress: CriterionCheckFunction = async (
  criterion: Database["public"]["Tables"]["quest_criteria"]["Row"],
  actionData: FinanceUnderAllowanceActionData,
  userId: string,
  userTimezone: string,
  activatedAt: Date | null // Provided by the main service, used for date check *before* calling this
): Promise<CriterionProgressResult | null> => {
  // Validate the config structure using the type guard
  if (!isFinanceUnderAllowanceConfig(criterion.config)) {
    console.warn(
      `[Quest Criteria - finance_under_allowance] Invalid or missing config for criterion ${criterion.id}`
    );
    return null;
  }

  // Basic actionData validation
  if (
    !actionData ||
    typeof actionData.date !== "string" ||
    typeof actionData.spent !== "number" ||
    typeof actionData.allowance !== "number"
  ) {
    console.warn(
      `[Quest Criteria - finance_under_allowance] Invalid actionData for criterion ${criterion.id}`
    );
    return null;
  }

  // Check if spending is within the allowance
  if (actionData.spent <= actionData.allowance) {
    // Target met for this day
    return { isMetOverride: true };
  }

  // Target not met
  return null;
};
