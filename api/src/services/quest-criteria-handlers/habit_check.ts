import { Database } from "../../types/supabase";
import {
  CriterionCheckFunction,
  CriterionProgressResult,
} from "../questCriteriaRegistry";

// Define the expected structure for the config object for this criterion type
interface HabitCheckConfig {
  habit_id: string;
  // Add other expected properties if any
}

// Type guard to check if the config object matches the expected structure
function isHabitCheckConfig(config: any): config is HabitCheckConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    typeof config.habit_id === "string"
  );
}

interface HabitCheckActionData {
  habitId: string;
  entryDate: string; // Keep for potential future use, though not strictly needed for check
}

/**
 * Checks progress for 'habit_check' criteria.
 * Increments progress if the logged habit matches the criterion's target habit ID.
 */
export const checkCriterionProgress: CriterionCheckFunction = async (
  criterion: Database["public"]["Tables"]["quest_criteria"]["Row"],
  actionData: HabitCheckActionData,
  userId: string,
  userTimezone: string,
  activatedAt: Date | null // Provided by the main service
): Promise<CriterionProgressResult | null> => {
  // Validate the config structure using the type guard
  if (!isHabitCheckConfig(criterion.config)) {
    console.warn(
      `[Quest Criteria - habit_check] Invalid or missing config for criterion ${criterion.id}`
    );
    return null;
  }

  // Basic actionData validation
  if (!actionData?.habitId) {
    console.warn(
      `[Quest Criteria - habit_check] Missing habitId in actionData for criterion ${criterion.id}`
    );
    return null; // Return null if actionData is invalid
  }

  // Now TypeScript knows criterion.config has habit_id
  // Check if the logged habit matches the target habit for this criterion
  if (actionData.habitId === criterion.config.habit_id) {
    // Match found, increment progress by 1
    return { progressIncrement: 1 };
  }

  // No match
  return null;
};
