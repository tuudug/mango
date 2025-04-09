import { Database } from "../../types/supabase";
import {
  CriterionCheckFunction,
  CriterionProgressResult,
} from "../questCriteriaRegistry";

// Define the expected structure for the config object for this criterion type
interface StepsReachConfig {
  target_steps: number;
  // Add other expected properties if any (e.g., period: 'daily' | 'weekly') - assume daily for now
}

// Type guard to check if the config object matches the expected structure
function isStepsReachConfig(config: any): config is StepsReachConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    typeof config.target_steps === "number"
  );
}

interface StepsReachActionData {
  date: string; // Date for which the steps count applies (e.g., 'YYYY-MM-DD')
  steps: number; // Number of steps achieved on that date
}

/**
 * Checks progress for 'steps_reach' criteria.
 * Sets isMetOverride to true if the steps achieved meet or exceed the target.
 * Assumes the activation date check has already been performed by the caller.
 */
export const checkCriterionProgress: CriterionCheckFunction = async (
  criterion: Database["public"]["Tables"]["quest_criteria"]["Row"],
  actionData: StepsReachActionData,
  userId: string,
  userTimezone: string,
  activatedAt: Date | null // Provided by the main service, used for date check *before* calling this
): Promise<CriterionProgressResult | null> => {
  // Validate the config structure using the type guard
  if (!isStepsReachConfig(criterion.config)) {
    console.warn(
      `[Quest Criteria - steps_reach] Invalid or missing config for criterion ${criterion.id}`
    );
    return null;
  }

  // Basic actionData validation
  if (
    !actionData ||
    typeof actionData.date !== "string" ||
    typeof actionData.steps !== "number"
  ) {
    console.warn(
      `[Quest Criteria - steps_reach] Invalid actionData for criterion ${criterion.id}`
    );
    return null;
  }

  // Check if steps meet or exceed the target
  if (actionData.steps >= criterion.config.target_steps) {
    // Target met for this day
    return { isMetOverride: true };
  }

  // Target not met
  return null;
};
