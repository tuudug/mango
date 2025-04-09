import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env" }); // Ensure environment variables are loaded

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
// Use a model known to be good at following JSON instructions if possible
// gemini-1.5-flash-latest might be better than 1.0-pro for strict JSON output. Test needed.
const MODEL_NAME = "gemini-1.5-flash-latest"; // Updated model suggestion

if (!API_KEY) {
  throw new Error("GOOGLE_GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const generationConfig = {
  temperature: 0.5, // Lower temperature might help with stricter format following
  topK: 1, // Keep these restrictive for format following
  topP: 1,
  maxOutputTokens: 4096, // Increased slightly for potentially larger JSON
  // Ensure response_mime_type is set if using Gemini 1.5 models for JSON mode
  responseMimeType: "application/json",
};

// Safety settings - adjust as needed for your use case
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Parses the Gemini response text to extract sub-tasks from <item_N> tags.
 * (Keeping this function for the existing todo breakdown feature)
 */
const parseSubTasks = (responseText: string): string[] => {
  const tasks: string[] = [];
  const regex = /<item_(\d+)>([\s\S]*?)<\/item_\1>/g;
  let match;

  while ((match = regex.exec(responseText)) !== null) {
    if (match[2]) {
      const cleanedTask = match[2].replace(/\s+/g, " ").trim();
      tasks.push(cleanedTask);
    }
  }
  return tasks;
};

/**
 * Simple input sanitizer to remove potentially problematic characters.
 * (Keeping this function for the existing todo breakdown feature)
 */
const sanitizeInput = (input: string): string => {
  // Remove backticks for now as a basic precaution
  return input.replace(/`/g, "");
};

/**
 * Calls the Gemini API to break down a task title into sub-tasks.
 * (Keeping this function for the existing todo breakdown feature)
 * @param taskTitle The title of the todo item to break down.
 * @param parentTitle Optional title of the parent task for context.
 * @returns An array of sub-task strings, or null if more context is needed.
 * @throws Throws an error if the API call fails or returns unsafe content.
 */
export const breakdownTask = async (
  taskTitle: string,
  parentTitle?: string // Added optional parentTitle
): Promise<string[] | null> => {
  // Sanitize inputs
  const sanitizedTaskTitle = sanitizeInput(taskTitle);
  const sanitizedParentTitle = parentTitle
    ? sanitizeInput(parentTitle)
    : undefined;

  // Construct the prompt conditionally
  let promptContext = `<todo_text>\n${sanitizedTaskTitle}\n</todo_text>`;
  if (sanitizedParentTitle) {
    promptContext = `<parent_task_text>\n${sanitizedParentTitle}\n</parent_task_text>\n${promptContext}`;
  }

  const promptInstruction = `
You are given a todo list item in the todo_text tag. ${
    sanitizedParentTitle
      ? "It is a sub-task of the task given in the parent_task_text tag."
      : ""
  }
Your job is to break down the task from todo_text into several simple, actionable sub-tasks, depending on the verbosity_level defined (1=least, 5=most).

If the given text is too ambiguous to break down and requires more context, you MUST return ONLY the text: <need_more_context>

Otherwise, return the sub-tasks using the following format ONLY:
<item_1>Simple subtask 1 text</item_1>
<item_2>Simple subtask 2 text</item_2>
...

IMPORTANT RULES for sub-task text:
- Each sub-task MUST be on a single line.
- Keep the text concise and clear.
- Use simple words.
- Do NOT use any special characters like quotes, colons, parentheses, or newlines within the sub-task text itself.
- Do NOT include any text outside the <item_N> tags.
  `.trim();

  const prompt = `
${promptContext}

<verbosity_level>3</verbosity_level>

${promptInstruction}
  `.trim();

  try {
    console.log(
      `Sending refined prompt to Gemini for task: "${sanitizedTaskTitle}" ${
        sanitizedParentTitle ? `(Parent: "${sanitizedParentTitle}")` : ""
      }`
    );
    // Use a config without JSON mime type for this specific function
    const textModel = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await textModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { ...generationConfig, responseMimeType: undefined }, // Override mime type
      safetySettings,
    });

    if (!result.response) {
      console.error("Gemini response blocked or unavailable.", result);
      throw new Error(
        "Gemini response was blocked due to safety settings or other issues."
      );
    }

    const responseText = result.response.text().trim();
    console.log(`Gemini raw response for breakdownTask: "${responseText}"`);

    if (responseText === "<need_more_context>") {
      console.log("Gemini indicated more context is needed.");
      return null;
    }

    const subTasks = parseSubTasks(responseText);

    if (subTasks.length === 0 && responseText !== "") {
      console.warn(
        "Gemini response did not contain valid <item_N> tags, but wasn't <need_more_context>."
      );
      return [];
    }

    console.log(`Parsed ${subTasks.length} sub-tasks from Gemini response.`);
    return subTasks;
  } catch (error) {
    console.error("Error calling Gemini API for breakdownTask:", error);
    throw new Error("Failed to break down task using AI.");
  }
};

/**
 * Calls the Gemini API with a given prompt and expects a JSON response.
 * @param prompt The prompt string to send to the LLM.
 * @returns The parsed JSON object from the LLM response.
 * @throws Throws an error if the API call fails, is blocked, or the response is not valid JSON.
 */
export const generateJsonContent = async <T = any>(
  prompt: string
): Promise<T> => {
  console.log("Sending prompt to Gemini for JSON generation...");
  try {
    // Use the model configured with responseMimeType: "application/json"
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig, // This should include responseMimeType: "application/json"
      safetySettings,
    });

    if (!result.response) {
      console.error("Gemini JSON response blocked or unavailable.", result);
      throw new Error(
        "Gemini response was blocked due to safety settings or other issues."
      );
    }

    const responseText = result.response.text();
    console.log("Gemini raw JSON response text:", responseText);

    // Attempt to parse the response text as JSON
    try {
      const parsedJson = JSON.parse(responseText);
      console.log("Successfully parsed Gemini JSON response.");
      return parsedJson as T;
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", parseError);
      console.error("Raw response text was:", responseText);
      throw new Error("Gemini response was not valid JSON.");
    }
  } catch (error) {
    console.error("Error calling Gemini API for JSON generation:", error);
    // Re-throw a generic error or the specific error
    if (error instanceof Error) {
      throw new Error(`Gemini API Error: ${error.message}`);
    }
    throw new Error("Failed to generate content using AI.");
  }
};
