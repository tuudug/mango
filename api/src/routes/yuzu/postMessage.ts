import { Request, Response, NextFunction } from "express";
import { generateChatResponse } from "../../services/geminiService";
import { getUserContextSummary } from "../../services/userContextService";
import { AuthenticatedRequest } from "../../middleware/auth"; // Use AuthenticatedRequest
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  TooManyRequestsError, // Need to add this error type
} from "../../utils/errors";

const yuzuRateLimit = new Map();
const YUZU_LIMIT = 10;
const YUZU_WINDOW_MS = 60 * 60 * 1000;

/**
 * POST /api/yuzu/message
 * Body: { message: string }
 * Response: { yuzuResponse: string, suggestions: string[], remaining: number, resetTime: number }
 */
export async function postMessage(
  req: AuthenticatedRequest, // Use AuthenticatedRequest
  res: Response,
  next: NextFunction // Add next function
): Promise<void> {
  try {
    const userId = req.user?.id; // Get userId from authenticated request
    const supabase = req.supabase; // Get supabase from authenticated request

    if (!userId || !supabase) {
      // Should be caught by auth middleware, but check defensively
      return next(new AuthenticationError("Authentication required."));
    }

    // --- Rate Limiting ---
    const now = Date.now();
    let record = yuzuRateLimit.get(userId);
    if (record) {
      if (now >= record.resetTime) {
        // Reset window if expired
        record = { count: 0, resetTime: now + YUZU_WINDOW_MS };
        yuzuRateLimit.set(userId, record);
      }
    } else {
      // First request for this user in the window
      record = { count: 0, resetTime: now + YUZU_WINDOW_MS };
      yuzuRateLimit.set(userId, record);
    }

    if (record.count >= YUZU_LIMIT) {
      // Use the custom error for rate limiting
      return next(
        new TooManyRequestsError("Yuzu chat limit reached.", {
          remaining: 0,
          resetTime: record.resetTime,
        })
      );
    }
    // Increment count after check passes
    record.count += 1;
    yuzuRateLimit.set(userId, record); // Update the map

    // --- Message Validation ---
    const userMessage =
      typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!userMessage) {
      return next(
        new BadRequestError("Missing or invalid 'message' in request body.")
      );
    }

    // --- Context Fetching ---
    let userContext = "";
    try {
      // Wrap context fetching in its own try/catch in case it fails
      userContext = await getUserContextSummary(userId, supabase);
    } catch (contextError) {
      console.error(
        `[Yuzu PostMessage] Error fetching user context for user ${userId}:`,
        contextError
      );
      // Decide if this is fatal. For now, proceed without context.
      userContext = "Error fetching user context.";
    }

    // --- History Processing ---
    let historyLog = "";
    const history = Array.isArray(req.body.history)
      ? req.body.history.slice(-10)
      : [];
    if (history.length > 0) {
      // Format as a simple chat log
      historyLog = history
        .map((msg: any) => {
          const sender = msg.sender === "yuzu" ? "Yuzu" : "User";
          const text = typeof msg.text === "string" ? msg.text : "";
          return `${sender}: ${text}`;
        })
        .join("\n");
    }

    // --- Prompt Construction ---
    const prompt = `
You are Yuzu, a helpful, concise, and generally positive virtual companion in the Mango app. You are continuing a conversation with the user.

**Your Goal:** Provide helpful, context-aware responses and suggestions based on the provided conversation history and user context data.

**Context Provided:**
<user_context>
${userContext}
</user_context>

Conversation history (most recent messages):
${historyLog || "No history yet."}

**Instructions:**
1.  **Analyze Context:** Carefully review the <user_context> and conversation history.
2.  **Respond to User:** Address the user's latest message directly.
    *   If asked "What should I do next?", check <todos> and <quests> in context. Suggest a specific pending todo or active quest by name. If none, suggest generating quests or adding a todo.
    *   If asked about tasks/todos, state the number of pending todos from context. If few (e.g., < 5), list their names.
    *   If asked about habits, summarize the status of specific habits from context (e.g., "You've done Exercise today, but Drink Water is still pending.").
    *   If the user mentions feelings (e.g., tired, motivated), relate your response to relevant context if possible (e.g., step count, upcoming events, recent progress).
    *   For jokes or simple greetings, respond appropriately.
3.  **Avoid Generic Praise:** Do not use overly enthusiastic or generic praise like "You're doing great!" unless directly responding to a specific achievement mentioned by the user or clearly indicated in the context (e.g., meeting a step goal, completing all habits). Focus on being helpful and specific.
4.  **Generate Suggestions:** Provide 2-4 short, relevant suggested replies for the *user*.
    *   Suggestions should be actionable and context-aware (e.g., suggest completing a specific pending habit, asking about a quest, checking finances).
    *   Suggestions should differ from the user's last message.
    *   Phrase suggestions as if the user would send them (e.g., "How many steps have I taken?", "Tell me about my 'Meditate' habit", "Generate new quests").
    *   If the conversation is just starting (no history), you can use: "What should I do next?", "Tell me a joke", "Do I have any tasks?".

**Output Format (MUST be valid JSON, no extra text):**
{
  "response": "Yuzu's concise and context-aware reply here.",
  "suggestions": ["Relevant Suggestion 1", "Relevant Suggestion 2", "Relevant Suggestion 3"]
}

User message: "${userMessage}"
    `.trim();

    // --- Call Gemini Service ---
    let yuzuResponse: string;
    let suggestions: string[];
    try {
      // Wrap the external API call
      const result = await generateChatResponse(prompt);
      yuzuResponse = result.yuzuResponse;
      suggestions = result.suggestions;
    } catch (geminiError) {
      console.error(
        "[Yuzu PostMessage] Error calling Gemini service:",
        geminiError
      );
      return next(
        new InternalServerError(
          "Failed to generate Yuzu response from AI service."
        )
      );
    }

    // --- Success Response ---
    res.status(200).json({
      yuzuResponse,
      suggestions,
      remaining: Math.max(0, YUZU_LIMIT - record.count), // Calculate remaining based on updated count
      resetTime: record.resetTime,
    });
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in postMessage handler:", error);
    next(error); // Pass to global error handler
  }
}
