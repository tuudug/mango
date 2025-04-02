import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { breakdownTask } from "../../services/geminiService"; // Import the service
import { TodoItem } from "../../types/todo";

const MAX_TODO_LEVEL = 2; // Consider moving to a shared constants file

export const breakdownTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { itemId: currentItemId } = req.params; // Renamed for clarity
    const { parentTitle } = req.body; // Extract optional parentTitle from body

    if (!userId || !supabaseUserClient || !currentItemId) {
      res.status(400).json({ message: "Missing user auth or item ID" });
      return;
    }

    // 1. Fetch the item being broken down (currentTodo)
    const { data: currentTodo, error: currentError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("title, level, connection_id") // No need to fetch parent_id here anymore
      .eq("id", currentItemId)
      .eq("user_id", userId)
      .single();

    if (currentError || !currentTodo) {
      console.error("Error fetching todo item for breakdown:", currentError);
      res
        .status(404)
        .json({ message: "Todo item not found or not owned by user" });
      return;
    }

    // Check level before calling AI
    if (currentTodo.level >= MAX_TODO_LEVEL) {
      res.status(400).json({
        message: `Cannot break down item at level ${currentTodo.level}`,
      });
      return;
    }

    // 2. Call Gemini Service, passing both titles if parentTitle exists
    console.log(
      `Breaking down: "${currentTodo.title}" (Parent: "${
        parentTitle || "N/A"
      }")`
    );
    const subTaskTitles = await breakdownTask(currentTodo.title, parentTitle); // Pass both

    // 3. Handle Gemini Response
    if (subTaskTitles === null) {
      res.status(422).json({
        code: "NEED_MORE_CONTEXT",
        message:
          "Task is too ambiguous to break down automatically. Please refine the task title.",
      });
      return;
    }

    if (subTaskTitles.length === 0) {
      res
        .status(200)
        .json({ message: "No sub-tasks generated.", createdSubItems: [] });
      return;
    }

    // 4. Prepare and Insert Sub-items if generated
    const connectionId = currentTodo.connection_id;
    const subItemLevel = currentTodo.level + 1;

    // Fetch current sibling count to determine starting position
    const { count: siblingCount, error: countError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("parent_id", currentItemId); // Use currentItemId as the parent_id for new sub-items

    if (countError) throw countError;
    const nextPosition = (siblingCount || 0) + 1;

    const subItemsData = subTaskTitles.map((title, index) => ({
      user_id: userId,
      connection_id: connectionId,
      title: title,
      parent_id: currentItemId, // The item being broken down is the parent
      level: subItemLevel,
      position: nextPosition + index,
    }));

    const { data: newSubTodos, error: insertError } = await supabaseUserClient
      .from("manual_todo_items")
      .insert(subItemsData)
      .select();

    if (insertError) throw insertError;

    console.log(
      `Generated and inserted ${
        newSubTodos?.length || 0
      } sub-items for todo ${currentItemId} for user ${userId}`
    );

    const resultTodos: TodoItem[] = (newSubTodos || []).map((todo) => ({
      ...todo,
      sourceProvider: "manual",
    }));

    res.status(201).json({ createdSubItems: resultTodos });
  } catch (err: unknown) {
    console.error("Server error breaking down todo item:", err);
    if (
      err instanceof Error &&
      (err.message.includes("Gemini") || err.message.includes("AI"))
    ) {
      // Specific AI errors might be returned directly
      res.status(500).json({ message: err.message });
    } else {
      // General errors passed to global handler
      next(err);
    }
  }
};
