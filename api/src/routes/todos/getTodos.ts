import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth"; // Adjust path as needed

// Define the TodoItem type locally or import from a shared types file if available
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

export const getTodosHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;

    if (!userId || !supabaseUserClient) {
      res.status(401).json({ message: "Authentication data missing" });
      return;
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

    if (manualError) throw manualError;

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
