import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types/supabase";
import { generateJsonContent } from "./geminiService"; // Import the new function

type QuestInsert = Database["public"]["Tables"]["quests"]["Insert"];
type CriteriaInsert = Database["public"]["Tables"]["quest_criteria"]["Insert"];
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
  console.log(`Starting ${type} quest generation for user ${userId}...`);

  try {
    // 1. Fetch User Data Context
    const userData = await fetchUserDataContext(userId, supabase);
    if (!userData) {
      return { success: false, message: "Failed to fetch user data." };
    }

    // 2. Construct Prompt
    const prompt = constructLlmPrompt(userData, type);
    const promptContext = { userDataSummary: "...", type }; // Store summarized context

    // 3. Call LLM using the new JSON generation function
    console.log("Calling Gemini for JSON quest generation...");
    // Use the specific LlmQuestResponse type for better type checking
    const llmResponseRaw = await generateJsonContent<LlmQuestResponse>(prompt);
    console.log("LLM JSON Response:", llmResponseRaw);

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
  console.log(`Fetching user data context for ${userId}...`);
  try {
    // Fetch user progress (level)
    const { data: progress, error: progressError } = await supabase
      .from("user_progress")
      .select("level")
      .eq("user_id", userId)
      .single();

    if (progressError && progressError.code !== "PGRST116") {
      console.error("Error fetching user progress for context:", progressError);
      return null;
    }
    const level = progress?.level ?? 1;

    // Fetch habits (example)
    const { data: habits, error: habitsError } = await supabase
      .from("manual_habits")
      .select("*")
      .eq("user_id", userId);

    if (habitsError) {
      console.error("Error fetching habits for context:", habitsError);
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
