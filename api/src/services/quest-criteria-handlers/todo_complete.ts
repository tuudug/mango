import { Database } from "../../types/supabase";
import {
  CriterionCheckFunction,
  CriterionProgressResult,
} from "../questCriteriaRegistry";

// Define the expected structure for the config object for this criterion type
interface TodoCompleteConfig {
  // No specific config properties needed for this type currently,
  // but define the interface for consistency and future expansion.
  // e.g., maybe target specific todo lists or tags later?
}

// Type guard to check if the config object matches the expected structure
// For now, just checks if it's an object (even empty)
function isTodoCompleteConfig(config: any): config is TodoCompleteConfig {
  return typeof config === "object" && config !== null;
}

interface TodoCompleteActionData {
  count: number; // Number of todos completed in this action (usually 1)
}

/**
 * Checks progress for 'todo_complete' criteria.
 * Increments progress by the count provided in actionData.
 */
export const checkCriterionProgress: CriterionCheckFunction = async (
  criterion: Database["public"]["Tables"]["quest_criteria"]["Row"],
  actionData: TodoCompleteActionData,
  userId: string,
  userTimezone: string,
  activatedAt: Date | null // Provided by the main service
): Promise<CriterionProgressResult | null> => {
  // Validate the config structure using the type guard
  if (!isTodoCompleteConfig(criterion.config)) {
    console.warn(
      `[Quest Criteria - todo_complete] Invalid or missing config for criterion ${criterion.id}`
    );
    return null;
  }

  // Basic actionData validation
  if (
    !actionData ||
    typeof actionData.count !== "number" ||
    actionData.count <= 0
  ) {
    console.warn(
      `[Quest Criteria - todo_complete] Invalid actionData (count) for criterion ${criterion.id}`
    );
    return null;
  }

  // Increment progress by the provided count
  return { progressIncrement: actionData.count };
};
