import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { breakdownTask } from "../../services/geminiService"; // Import the service

// Define the TodoItem type locally or import
interface TodoItem {
  id: string;
  connection_id: string;
  title: string;
  is_completed: boolean;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  position: number;
  parent_id?: string | null;
  level: number;
  sourceProvider: "manual";
}

const MAX_TODO_LEVEL = 2; // Consider moving to a shared constants file

export const breakdownTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { itemId: parentId } = req.params;

    if (!userId || !supabaseUserClient || !parentId) {
      res.status(400).json({ message: "Missing user auth or parent item ID" });
      return;
    }

    // 1. Fetch parent to check level, get title and connection_id
    const { data: parentTodo, error: parentError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("title, level, connection_id")
      .eq("id", parentId)
      .eq("user_id", userId)
      .single();

    if (parentError || !parentTodo) {
      console.error("Error fetching parent todo for breakdown:", parentError);
      res
        .status(404)
        .json({ message: "Parent todo item not found or not owned by user" });
      return;
    }

    if (parentTodo.level >= MAX_TODO_LEVEL) {
      res.status(400).json({
        message: `Cannot break down item at level ${parentTodo.level}`,
      });
      return;
    }

    // 2. Call Gemini Service
    const subTaskTitles = await breakdownTask(parentTodo.title);

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
    const connectionId = parentTodo.connection_id;
    const subItemLevel = parentTodo.level + 1;

    const { count: siblingCount, error: countError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("parent_id", parentId);

    if (countError) throw countError;
    const nextPosition = (siblingCount || 0) + 1;

    const subItemsData = subTaskTitles.map((title, index) => ({
      user_id: userId,
      connection_id: connectionId,
      title: title,
      parent_id: parentId,
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
      } sub-items for todo ${parentId} for user ${userId}`
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
      res.status(500).json({ message: err.message });
    } else {
      next(err);
    }
  }
};
