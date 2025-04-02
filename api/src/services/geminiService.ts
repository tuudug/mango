import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config({ path: ".env" }); // Ensure environment variables are loaded

const API_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash-lite"; // Or your preferred model

if (!API_KEY) {
  throw new Error("GOOGLE_GEMINI_API_KEY environment variable not set.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const generationConfig = {
  temperature: 0.7, // Adjust creativity (0=deterministic, 1=max creative)
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048, // Adjust as needed
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
 */
const sanitizeInput = (input: string): string => {
  // Remove backticks for now as a basic precaution
  return input.replace(/`/g, "");
  // Could add more replacements here if needed, e.g., for specific HTML/XML chars
  // Be cautious not to remove characters the user might legitimately use in a title.
};

/**
 * Calls the Gemini API to break down a task title into sub-tasks.
 * @param taskTitle The title of the todo item to break down.
 * @returns An array of sub-task strings, or null if more context is needed.
 * @throws Throws an error if the API call fails or returns unsafe content.
 */
export const breakdownTask = async (
  taskTitle: string
): Promise<string[] | null> => {
  // Sanitize the input title before using it in the prompt
  const sanitizedTitle = sanitizeInput(taskTitle);

  const prompt = `
<todo_text>
${sanitizedTitle}
</todo_text>

<verbosity_level>3</verbosity_level>

You are given a todo list item from our user in the todo_text tag. Your job is to break down the task into several simple, actionable sub-tasks, depending on the verbosity_level defined (1=least, 5=most).

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

  try {
    console.log(
      `Sending refined prompt to Gemini for task: "${sanitizedTitle}"`
    ); // Log sanitized title
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    if (!result.response) {
      console.error("Gemini response blocked or unavailable.", result);
      throw new Error(
        "Gemini response was blocked due to safety settings or other issues."
      );
    }

    const responseText = result.response.text().trim();
    console.log(`Gemini raw response: "${responseText}"`);

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
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to break down task using AI.");
  }
};
