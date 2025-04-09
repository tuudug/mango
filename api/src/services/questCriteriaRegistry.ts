import { Database } from "../types/supabase"; // Import the main Database type
import * as habitCheckHandler from "./quest-criteria-handlers/habit_check";
import * as stepsReachHandler from "./quest-criteria-handlers/steps_reach";
import * as financeUnderAllowanceHandler from "./quest-criteria-handlers/finance_under_allowance";
import * as todoCompleteHandler from "./quest-criteria-handlers/todo_complete";

// Define a standard interface for the handler function's return value
export interface CriterionProgressResult {
  progressIncrement?: number; // How much to increment current_progress
  isMetOverride?: boolean; // Directly set is_met to true, ignoring progress/target
}

// Define a standard interface for the handler function itself
export type CriterionCheckFunction = (
  // Use the correct Supabase table row type
  criterion: Database["public"]["Tables"]["quest_criteria"]["Row"],
  actionData: any, // Type will vary based on actionType
  userId: string,
  userTimezone: string,
  activatedAt: Date | null // Pass the quest activation timestamp
) => Promise<CriterionProgressResult | null>; // Return null if criteria doesn't apply or fails check

// Map criteria types to their handler functions
export const criteriaHandlers: Record<string, CriterionCheckFunction> = {
  habit_check: habitCheckHandler.checkCriterionProgress,
  steps_reach: stepsReachHandler.checkCriterionProgress,
  finance_under_allowance: financeUnderAllowanceHandler.checkCriterionProgress,
  todo_complete: todoCompleteHandler.checkCriterionProgress,
  // 'pomodoro_session': // Excluded for v0.2.3
};

console.log("Quest Criteria Registry loaded."); // Add log to confirm loading
