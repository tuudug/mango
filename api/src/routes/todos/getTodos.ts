import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth"; // Adjust path as needed
import { TodoItem } from "../../types/todo";
import { InternalServerError } from "../../utils/errors"; // Import custom error

export const getTodosHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;

    if (!userId || !supabaseUserClient) {
      // Use next with custom error for server/middleware issues
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }

    let allTodoItems: TodoItem[] = [];

    const { data: manualTodos, error: manualError } = await supabaseUserClient
      .from("manual_todo_items")
      .select(
        "id, connection_id, title, is_completed, due_date, created_at, updated_at, position, parent_id, level"
      )
      .eq("user_id", userId)
      .order("level", { ascending: true })
      .order("position", { ascending: true });

    if (manualError) {
      console.error(
        `Supabase error fetching todos for user ${userId}:`,
        manualError
      );
      return next(new InternalServerError("Failed to fetch todo items"));
    }

    if (manualTodos) {
      allTodoItems = manualTodos.map((todo) => ({
        ...todo,
        sourceProvider: "manual",
      })) as TodoItem[];
      console.log(
        `Fetched ${allTodoItems.length} manual todo items for user ${userId}`
      );
    }

    res.status(200).json({ todoItems: allTodoItems });
  } catch (error) {
    console.error("Error in GET /api/todos handler:", error);
    next(error);
  }
};
