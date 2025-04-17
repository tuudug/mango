import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { generateJsonContent } from "./geminiService";
import { criteriaHandlers } from "./questCriteriaRegistry"; // Import handlers registry
// Corrected import: Removed zonedTimeToUtc, kept formatInTimeZone and toZonedTime (though toZonedTime might not be needed here either)
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { sleep } from "../utils/sleep"; // Import sleep utility

type Quest = Database["public"]["Tables"]["quests"]["Row"];
type QuestCriterion = Database["public"]["Tables"]["quest_criteria"]["Row"];
type QuestInsert = Database["public"]["Tables"]["quests"]["Insert"];
type CriteriaInsert = Database["public"]["Tables"]["quest_criteria"]["Insert"];
type QuestStatus = Database["public"]["Enums"]["quest_status"];
type QuestCriteriaType = Database["public"]["Enums"]["quest_criteria_type"];
type UserQuestState = Database["public"]["Tables"]["user_quest_state"]["Row"];
type Habit = Database["public"]["Tables"]["manual_habits"]["Row"]; // Assuming table name

// Define expected structure from LLM JSON response
interface LlmQuestResponse {
  quests: {
    description: string;
    xp_reward: number;
    criteria: {
      description: string;
      type: string; // Will be validated against enum
      config: Record<string, any>; // e.g., { habit_name: string, target_count: number }
    }[];
  }[];
}

interface GenerationResult {
  success: boolean;
  message: string;
  generatedQuests?: any[]; // Define a proper type later
  error?: any;
}

// Placeholder for user data structure
interface UserDataContext {
  userId: string;
  level: number;
  // Add fields for habits, steps, finance, todos, pomodoro etc.
  habits?: Habit[];
  // ... other data fields
}

/**
 * Generates quests for a user using an LLM.
 * @param userId The ID of the user.
 * @param type 'daily' or 'weekly'.
 * @param supabase Supabase client instance.
 * @returns GenerationResult object.
 */
export async function generateQuestsForUser(
  userId: string,
  type: "daily" | "weekly",
  supabase: SupabaseClient<Database>
): Promise<GenerationResult> {
  console.log(
    `[QuestService] Starting ${type} quest generation for user ${userId}...`
  );

  try {
    // 1. Fetch User Data Context
    const userData = await fetchUserDataContext(userId, supabase);
    if (!userData) {
      return { success: false, message: "Failed to fetch user data." };
    }

    // 2. Construct Prompt
    const prompt = constructLlmPrompt(userData, type);
    const promptContext = { userDataSummary: "...", type }; // Store summarized context

    const llmResponseRaw = await generateJsonContent<LlmQuestResponse>(prompt);

    // Basic check if the response structure is as expected (even with JSON mode, double-check)
    if (!llmResponseRaw || !Array.isArray(llmResponseRaw.quests)) {
      return {
        success: false,
        message: "LLM did not return the expected JSON structure.",
        error: llmResponseRaw,
      };
    }

    // 4. Parse, Validate & Map Response
    // Pass userId and type here
    const validationResult = await parseAndValidateLlmResponse(
      llmResponseRaw, // Pass the parsed JSON object
      userData,
      userId,
      type
    );
    if (!validationResult.valid) {
      return {
        success: false,
        message: "LLM response validation failed.",
        error: validationResult.errors,
      };
    }
    const { questsToInsert, criteriaToInsert } = validationResult;

    // 5. Store Results in Database
    // Pass questsToInsert which now include user_id and type
    const storeResult = await storeGeneratedQuests(
      userId, // Still needed for user_quest_state update
      type, // Still needed for user_quest_state update
      questsToInsert,
      criteriaToInsert,
      promptContext, // Store the context used for the prompt
      llmResponseRaw, // Store the raw (parsed) JSON response
      supabase
    );

    if (!storeResult.success) {
      return {
        success: false,
        message: "Failed to store generated quests.",
        error: storeResult.error,
      };
    }

    console.log(
      `Successfully generated and stored ${questsToInsert.length} ${type} quests for user ${userId}.`
    );
    return {
      success: true,
      message: `Generated ${questsToInsert.length} ${type} quests.`,
      generatedQuests: storeResult.insertedQuests, // Return the actual inserted quests
    };
  } catch (error) {
    console.error(`Error generating ${type} quests for user ${userId}:`, error);
    // Pass the error message from generateJsonContent if it exists
    const errorMessage =
      error instanceof Error
        ? error.message
        : `An unexpected error occurred during ${type} quest generation.`;
    return {
      success: false,
      message: errorMessage,
      error: error,
    };
  }
}

// --- Helper Functions (Implementations needed) ---

async function fetchUserDataContext(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<UserDataContext | null> {
  console.log(`[QuestService] Fetching user data context for ${userId}...`);
  try {
    // Fetch user progress (level)
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("level")
      .eq("user_id", userId)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      console.error(
        "[QuestService] Error fetching user progress for context:",
        progressError
      );
      return null;
    }
    const level = progress?.level ?? 1;

    // Fetch habits (example)
    const { data: habits, error: habitsError } = await supabase
      .from("manual_habits")
      .select("*")
      .eq("user_id", userId);

    if (habitsError) {
      console.error(
        "[QuestService] Error fetching habits for context:",
        habitsError
      );
      // Decide if this is critical - maybe return null or proceed without habits
    }

    // TODO: Fetch other relevant data (steps, finance, todos, pomodoro)
    // Be mindful of data volume - fetch recent/summarized data only.

    return {
      userId,
      level,
      habits: habits ?? [],
      // ... other fetched data
    };
  } catch (error) {
    console.error("Error in fetchUserDataContext:", error);
    return null;
  }
}

function constructLlmPrompt(
  userData: UserDataContext,
  type: "daily" | "weekly"
): string {
  const questCount = type === "daily" ? 15 : 5; // Target number of quests
  const userLevel = userData.level;
  const habitNames =
    userData.habits?.map((h) => h.name).join(", ") || "No habits defined";

  // TODO: Refine prompt significantly based on available data and desired quest variety/difficulty scaling.
  // IMPORTANT: Ensure the prompt explicitly asks for JSON output matching the LlmQuestResponse interface.
  const prompt = `
You are a quest generator for a personal productivity gamification app called Mango.
Generate ${questCount} ${type} quests suitable for a Level ${userLevel} user.
The user has the following habits defined: ${habitNames}.
Consider other user activity patterns if available (e.g., steps, finances, todos - data not fully included in this example).

For each quest, provide:
- description: A short, engaging description for the user.
- xp_reward: An integer XP value (e.g., 10-50 for daily, 50-200 for weekly, scaled by perceived difficulty).
- criteria: An array of 1-3 criteria needed to complete the quest.

For each criterion, provide:
- description: A short description of the criterion (e.g., "Check-in 'Meditate' habit").
- type: One of the allowed types: 'habit_check', 'steps_reach', 'finance_under_allowance', 'pomodoro_session', 'todo_complete'.
- config: A JSON object with details specific to the type. Examples:
    - For 'habit_check': { "habit_name": "Meditate", "target_count": 1 } (Use the EXACT habit name from the list provided if applicable)
    - For 'steps_reach': { "target_count": 5000 }
    - For 'finance_under_allowance': { "target_count": 1 } (Target is always 1, meaning stay under budget for the day/week)
    - For 'pomodoro_session': { "target_count": 3 } (Number of completed work sessions)
    - For 'todo_complete': { "target_count": 5 } (Number of todos completed)

Output ONLY a valid JSON object adhering to the following structure, with no other text, markdown formatting, or explanations before or after it:
{
  "quests": [
    {
      "description": "string",
      "xp_reward": number,
      "criteria": [
        {
          "description": "string",
          "type": "string (must be one of the allowed types)",
          "config": { /* JSON object specific to type */ }
        }
        // ... more criteria (1-3 per quest)
      ]
    }
    // ... more quests (${questCount} total)
  ]
}
`;
  return prompt.trim(); // Trim whitespace
}

// Placeholder function - REMOVED as we now call the actual LLM
// function getPlaceholderLlmResponse(type: "daily" | "weekly"): any { ... }

interface ValidationResult {
  valid: boolean;
  errors: string[];
  questsToInsert: QuestInsert[];
  criteriaToInsert: CriteriaInsert[]; // Will need temporary IDs to link
}

// Updated function signature - llmResponse is now the parsed LlmQuestResponse object
async function parseAndValidateLlmResponse(
  llmResponse: LlmQuestResponse, // Use the specific type
  userData: UserDataContext,
  userId: string, // Added userId
  type: "daily" | "weekly" // Added type
): Promise<ValidationResult> {
  const errors: string[] = [];
  const questsToInsert: QuestInsert[] = [];
  const criteriaToInsert: CriteriaInsert[] = [];
  const allowedTypes = [
    "habit_check",
    "steps_reach",
    "finance_under_allowance",
    "pomodoro_session",
    "todo_complete",
  ];
  const userHabitsMap = new Map(userData.habits?.map((h) => [h.name, h.id]));

  // Already checked for llmResponse and llmResponse.quests existence before calling
  // if (!llmResponse || !Array.isArray(llmResponse.quests)) { ... }

  for (const quest of llmResponse.quests) {
    // Basic validation
    if (
      !quest.description ||
      typeof quest.description !== "string" ||
      !quest.xp_reward ||
      typeof quest.xp_reward !== "number" ||
      !Number.isInteger(quest.xp_reward) ||
      quest.xp_reward <= 0 ||
      !Array.isArray(quest.criteria) ||
      quest.criteria.length === 0
    ) {
      errors.push(
        `Invalid quest structure or missing/invalid fields: ${JSON.stringify(
          quest
        )}`
      );
      continue; // Skip this invalid quest
    }

    const tempQuestId = crypto.randomUUID(); // Temporary ID for linking criteria
    // Create the object with all required fields for QuestInsert
    const questInsertData: QuestInsert = {
      id: tempQuestId, // Use temp ID for now
      user_id: userId, // Set user_id here
      type: type, // Set type here
      description: quest.description,
      xp_reward: quest.xp_reward,
      status: "available", // Default status
      source: "llm_generated", // Default source
      // llm_prompt_context and llm_response_raw will be set in storeGeneratedQuests
    };

    let questIsValid = true;
    const currentQuestCriteria: CriteriaInsert[] = [];

    for (const criterion of quest.criteria) {
      if (
        !criterion.description ||
        typeof criterion.description !== "string" ||
        !criterion.type ||
        !allowedTypes.includes(criterion.type) ||
        !criterion.config ||
        typeof criterion.config !== "object"
      ) {
        errors.push(
          `Invalid criterion structure in quest '${
            quest.description
          }': ${JSON.stringify(criterion)}`
        );
        questIsValid = false;
        break; // Stop processing criteria for this invalid quest
      }

      // Type-specific config validation and mapping
      let targetCount = 1; // Default
      if (
        criterion.config.target_count &&
        typeof criterion.config.target_count === "number" &&
        Number.isInteger(criterion.config.target_count) &&
        criterion.config.target_count > 0
      ) {
        targetCount = criterion.config.target_count;
      } else if (criterion.type !== "finance_under_allowance") {
        // finance target is implicitly 1, others need explicit count
        errors.push(
          `Invalid or missing target_count for criterion type '${criterion.type}' in quest '${quest.description}'`
        );
        questIsValid = false;
        break;
      }

      const criterionConfig = { ...criterion.config }; // Copy config

      if (criterion.type === "habit_check") {
        if (
          !criterion.config.habit_name ||
          typeof criterion.config.habit_name !== "string"
        ) {
          errors.push(
            `Missing or invalid habit_name for habit_check criterion in quest '${quest.description}'`
          );
          questIsValid = false;
          break;
        }
        const habitId = userHabitsMap.get(criterion.config.habit_name);
        if (!habitId) {
          // Log error but potentially allow quest if other criteria are valid?
          // For now, fail the quest if any habit doesn't match.
          errors.push(
            `LLM referenced non-existent or mismatched habit name '${
              criterion.config.habit_name
            }' in quest '${quest.description}'. Available habits: ${Array.from(
              userHabitsMap.keys()
            ).join(", ")}`
          );
          questIsValid = false;
          break;
        }
        // Add habit_id to the config to be stored
        criterionConfig.habit_id = habitId;
        // Optionally remove habit_name if only ID is needed in DB
        // delete criterionConfig.habit_name;
      }

      // Add other type-specific validations if needed (e.g., range checks for steps)

      currentQuestCriteria.push({
        quest_id: tempQuestId, // Link to temporary quest ID
        description: criterion.description,
        type: criterion.type as CriteriaInsert["type"], // Cast validated type
        config: criterionConfig, // Store potentially modified config
        target_count: targetCount,
        is_met: false, // Default
        current_progress: 0, // Default
      });
    } // End criteria loop

    if (questIsValid) {
      questsToInsert.push(questInsertData);
      criteriaToInsert.push(...currentQuestCriteria);
    }
  } // End quest loop

  return {
    valid: errors.length === 0,
    errors,
    questsToInsert,
    criteriaToInsert,
  };
}

interface StoreResult {
  success: boolean;
  error?: any;
  insertedQuests?: any[]; // Define proper type
}

// Updated function signature - quests array now contains full QuestInsert objects
async function storeGeneratedQuests(
  userId: string, // Still needed for user_quest_state
  type: "daily" | "weekly", // Still needed for user_quest_state
  quests: QuestInsert[], // Array now contains full QuestInsert objects
  criteria: CriteriaInsert[],
  promptContext: any,
  llmResponseRaw: any, // This is now the parsed JSON object
  supabase: SupabaseClient<Database>
): Promise<StoreResult> {
  if (quests.length === 0) {
    return { success: true, insertedQuests: [] }; // Nothing to insert
  }

  // Add llm context/response just before insertion
  const questsWithLlmData = quests.map((q) => ({
    ...q,
    llm_prompt_context: promptContext,
    llm_response_raw: llmResponseRaw, // Store the parsed JSON response
  }));

  try {
    // Insert Quests
    const { data: insertedQuestsData, error: questError } = await supabase
      .from("quests")
      .insert(questsWithLlmData) // Insert quests with user_id, type, and LLM data
      .select(); // Select to get final IDs

    if (questError) {
      console.error("Error inserting generated quests:", questError);
      return { success: false, error: questError };
    }
    if (!insertedQuestsData || insertedQuestsData.length !== quests.length) {
      console.error(
        "Mismatch in inserted quest count:",
        insertedQuestsData?.length,
        quests.length
      );
      return { success: false, error: "Quest insertion count mismatch." };
    }

    // Map temporary quest IDs to actual inserted IDs
    const tempIdToActualIdMap = new Map<string, string>();
    for (let i = 0; i < quests.length; i++) {
      const tempId = quests[i].id; // The temp UUID we assigned
      const actualId = insertedQuestsData[i].id; // The real UUID from DB
      if (tempId) {
        tempIdToActualIdMap.set(tempId, actualId);
      }
    }

    // Update criteria with actual quest_id
    const finalCriteria = criteria.map((c) => {
      const actualQuestId = tempIdToActualIdMap.get(c.quest_id as string);
      if (!actualQuestId) {
        // This should ideally not happen if logic is correct
        throw new Error(
          `Could not find actual quest ID for temporary ID: ${c.quest_id}`
        );
      }
      return {
        ...c,
        quest_id: actualQuestId, // Replace temp ID with actual ID
      };
    });

    // Insert Criteria
    const { error: criteriaError } = await supabase
      .from("quest_criteria")
      .insert(finalCriteria);

    if (criteriaError) {
      console.error("Error inserting generated criteria:", criteriaError);
      // Consider cleanup? Delete inserted quests? For now, report error.
      return { success: false, error: criteriaError };
    }

    // Update User Quest State (last generated time)
    const stateUpdateCol =
      type === "daily" ? "last_daily_generated_at" : "last_weekly_generated_at";
    const { error: stateError } = await supabase
      .from("user_quest_state")
      .upsert(
        { user_id: userId, [stateUpdateCol]: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    if (stateError) {
      console.error("Error updating user quest state:", stateError);
      // Non-critical error? Log and continue.
    }

    // TODO: Calculate and update next_weekly_reset_allowed_at if type is 'weekly'

    return { success: true, insertedQuests: insertedQuestsData };
  } catch (error) {
    console.error("Error in storeGeneratedQuests:", error);
    return { success: false, error };
  }
}

// --- Quest Progress Tracking ---

/**
 * Checks if all criteria for a given quest are met and updates the quest status to 'claimable'.
 * Should be called within a transaction after a criterion's is_met status changes to true.
 * @param questId The ID of the quest to check.
 * @param supabase Supabase client instance.
 */
async function checkAndSetQuestClaimable(
  questId: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  console.log(`[Quest Claimable Check] Checking quest ${questId}...`); // Added log
  try {
    // Fetch the quest itself to ensure it's still 'active'
    const { data: questData, error: questFetchError } = await supabase
      .from("quests")
      .select("id, status")
      .eq("id", questId)
      .single();

    if (questFetchError || !questData) {
      console.error(
        `[Quest Claimable Check] Error fetching quest ${questId}:`,
        questFetchError
      );
      // Don't throw, just log and exit, as the primary update might have succeeded
      return;
    }

    // Only proceed if the quest is currently 'active'
    if (questData.status !== "active") {
      console.log(
        `[Quest Claimable Check] Quest ${questId} is not active (status: ${questData.status}). Skipping claimable check.`
      );
      return;
    }

    // Fetch all criteria for the quest
    const { data: criteria, error: criteriaError } = await supabase
      .from("quest_criteria")
      .select("id, is_met")
      .eq("quest_id", questId);

    if (criteriaError) {
      console.error(
        `[Quest Claimable Check] Error fetching criteria for quest ${questId}:`,
        criteriaError
      );
      return; // Don't proceed if criteria can't be fetched
    }

    if (!criteria || criteria.length === 0) {
      console.warn(
        `[Quest Claimable Check] No criteria found for quest ${questId}. Cannot set claimable.`
      );
      return; // Should not happen for valid quests
    }

    // Check if all criteria are met
    const allMet = criteria.every((c) => c.is_met === true);
    console.log(
      `[Quest Claimable Check] Quest ${questId} - All criteria met: ${allMet}`
    ); // Added log

    if (allMet) {
      console.log(
        `[Quest Claimable Check] Attempting to update quest ${questId} status to claimable.` // Added log
      );
      // Update quest status to 'claimable'
      const { error: updateError } = await supabase
        .from("quests")
        .update({
          status: "claimable" as QuestStatus,
          claimable_at: new Date().toISOString(),
        })
        .eq("id", questId)
        .eq("status", "active"); // Ensure it's still active

      if (updateError) {
        console.error(
          `[Quest Claimable Check] Error updating quest ${questId} status to claimable:`,
          updateError
        );
      } else {
        // Correctly wrap the log message
        console.log(
          `[Quest Claimable Check] Successfully updated quest ${questId} status to claimable.` // Added log
        );
        // Add a small delay to allow potential DB propagation before frontend refetches
        await sleep(200); // Sleep for 200ms
        // TODO: Optionally trigger a notification to the frontend (e.g., via Supabase Realtime or other mechanism)
      }
    } else {
      // This log might be redundant if the allMet log is false, but keep for clarity
      console.log(
        `[Quest Claimable Check] Not all criteria met for quest ${questId}. Status remains active.` // Added log
      );
    }
  } catch (error) {
    console.error(
      `[Quest Claimable Check] Unexpected error checking quest ${questId}:`,
      error
    );
    // Rethrow if needed to ensure transaction rollback
    throw error;
  }
}

/**
 * Updates progress for active quests based on a user action.
 * @param userId The ID of the user performing the action.
 * @param actionType The type of action performed (matches quest_criteria_type).
 * @param actionData Data specific to the action (e.g., { habitId: '...' }).
 * @param userTimezone The user's IANA timezone string (e.g., 'America/New_York').
 * @param supabase Supabase client instance.
 */
export async function updateQuestProgress(
  userId: string,
  actionType: QuestCriteriaType,
  actionData: any,
  userTimezone: string,
  supabase: SupabaseClient<Database>
): Promise<void> {
  console.log(
    `[Quest Progress] Updating for user ${userId}, action: ${actionType}, data:`,
    actionData
  );

  try {
    // 1. Find relevant active, unmet criteria
    const { data: criteria, error: criteriaError } = await supabase
      .from("quest_criteria")
      .select("*, quests (id, activated_at, status)") // Select parent quest data too
      .eq("quests.user_id", userId)
      .eq("quests.status", "active" as QuestStatus) // Only check criteria for active quests
      .eq("type", actionType)
      .eq("is_met", false); // Only check unmet criteria

    if (criteriaError) {
      console.error(
        "[Quest Progress] Error fetching active criteria:",
        criteriaError
      );
      return;
    }

    if (!criteria || criteria.length === 0) {
      console.log(
        `[Quest Progress] No active, unmet criteria found for action type ${actionType}.`
      );
      return;
    }

    console.log(
      `[Quest Progress] Found ${criteria.length} potential criteria to update for action ${actionType}.`
    );

    // 2. Process each criterion
    for (const criterion of criteria) {
      // Ensure parent quest data is present (should be due to join)
      if (!criterion.quests || criterion.quests.status !== "active") {
        console.warn(
          `[Quest Progress] Skipping criterion ${criterion.id} as parent quest data is missing or not active.`
        );
        continue;
      }

      const parentQuest = criterion.quests;
      const activatedAt = parentQuest.activated_at
        ? new Date(parentQuest.activated_at)
        : null;

      // 3. Activation Date Check (for relevant types)
      if (
        actionType === "steps_reach" ||
        actionType === "finance_under_allowance"
      ) {
        if (!activatedAt) {
          console.warn(
            `[Quest Progress] Skipping criterion ${criterion.id} of type ${actionType} because parent quest activation date is missing.`
          );
          continue;
        }
        if (!actionData.date || typeof actionData.date !== "string") {
          console.warn(
            `[Quest Progress] Skipping criterion ${criterion.id} of type ${actionType} because actionData.date is missing or invalid.`
          );
          continue;
        }

        try {
          // Parse the action date string (assuming it's like 'YYYY-MM-DD')
          const actionDate = new Date(actionData.date + "T00:00:00"); // Add time to avoid potential UTC conversion issues with just date

          // Format both dates into 'yyyy-MM-dd' strings using the user's timezone
          const actionDateStr = formatInTimeZone(
            actionDate,
            userTimezone,
            "yyyy-MM-dd"
          );
          const activationDateStr = formatInTimeZone(
            activatedAt,
            userTimezone,
            "yyyy-MM-dd"
          );

          // Perform the comparison
          if (actionDateStr < activationDateStr) {
            console.log(
              `[Quest Progress] Skipping criterion ${criterion.id}: Action date ${actionDateStr} is before activation date ${activationDateStr}.`
            );
            continue; // Action occurred before quest activation
          }
          // If comparison passes, proceed (no 'else' needed here)
        } catch (tzError) {
          console.error(
            `[Quest Progress] Error comparing dates for criterion ${criterion.id} using timezone ${userTimezone}:`,
            tzError
          );
          continue; // Skip if timezone logic fails
        }
      }

      // 4. Get and call the specific handler
      const handler = criteriaHandlers[actionType];
      if (!handler) {
        console.warn(
          `[Quest Progress] No handler found for action type ${actionType}.`
        );
        continue; // Skip if no handler registered
      }

      try {
        const result = await handler(
          criterion,
          actionData,
          userId,
          userTimezone,
          activatedAt
        );

        if (result) {
          let criterionUpdated = false;
          let newIsMet = criterion.is_met; // Start with current value
          let updateObject: Partial<QuestCriterion> = {};

          // Determine update based on handler result
          if (result.isMetOverride === true) {
            if (!criterion.is_met) {
              // Only update if it wasn't already met
              updateObject.is_met = true;
              updateObject.current_progress = criterion.target_count; // Max out progress when met directly
              criterionUpdated = true;
              newIsMet = true;
              console.log(
                `[Quest Progress] Criterion ${criterion.id} met via override.`
              );
            }
          } else if (result.progressIncrement && result.progressIncrement > 0) {
            const newProgress =
              criterion.current_progress + result.progressIncrement;
            updateObject.current_progress = Math.min(
              newProgress,
              criterion.target_count
            ); // Cap at target

            if (
              !criterion.is_met &&
              updateObject.current_progress >= criterion.target_count
            ) {
              updateObject.is_met = true;
              newIsMet = true;
              console.log(
                `[Quest Progress] Criterion ${criterion.id} met via progress increment.`
              );
            }
            criterionUpdated = true;
            console.log(
              `[Quest Progress] Criterion ${criterion.id} progress updated to ${updateObject.current_progress}.`
            );
          }

          // Perform the update if changes occurred
          if (criterionUpdated) {
            const { error: updateError } = await supabase
              .from("quest_criteria")
              .update(updateObject)
              .eq("id", criterion.id)
              .eq("is_met", false); // Optimistic concurrency: only update if still not met

            if (updateError) {
              console.error(
                `[Quest Progress] Error updating criterion ${criterion.id}:`,
                updateError
              );
              // Don't proceed to check claimable status if update failed
            } else {
              // 5. If the criterion is now met, check if the quest is claimable
              if (newIsMet) {
                // Call checkAndSetQuestClaimable *after* successful update
                // Pass the regular supabase client, not a transaction client
                await checkAndSetQuestClaimable(criterion.quest_id, supabase);
              }
            }
          }
        } else {
          console.log(
            `[Quest Progress] Handler for criterion ${criterion.id} (type ${actionType}) returned null (no update needed).`
          );
        }
      } catch (handlerError) {
        console.error(
          `[Quest Progress] Error executing handler for criterion ${criterion.id} (type ${actionType}):`,
          handlerError
        );
        // Continue to next criterion
      }
    } // End loop through criteria
  } catch (error) {
    console.error(
      "[Quest Progress] Unexpected error in updateQuestProgress:",
      error
    );
  }
}
