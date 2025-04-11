import { Request, Response } from "express";
import { generateChatResponse } from "../../services/geminiService";
import { getUserContextSummary } from "../../services/userContextService";

/**
 * POST /api/yuzu/message
 * Body: { message: string }
 * Response: { yuzuResponse: string }
 */
export async function postMessage(req: Request, res: Response): Promise<void> {
  try {
    const userMessage =
      typeof req.body.message === "string" ? req.body.message.trim() : "";
    if (!userMessage) {
      res
        .status(400)
        .json({ error: "Missing or invalid 'message' in request body." });
      return;
    }

    // Fetch user context from all data sources
    const userId = req.user?.id;
    const supabase = req.supabase;
    let userContext = "";
    if (userId && supabase) {
      userContext = await getUserContextSummary(userId, supabase);
    }

    // Get last 10 messages from history (if provided)
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

    // Construct a prompt for Yuzu's personality, including conversation history and user context
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

    const { yuzuResponse, suggestions } = await generateChatResponse(prompt);

    res.status(200).json({ yuzuResponse, suggestions });
  } catch (error) {
    console.error("Error in Yuzu postMessage:", error);
    res.status(500).json({ error: "Failed to generate Yuzu response." });
  }
}
