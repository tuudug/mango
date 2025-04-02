import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

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

export const editManualTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Check if itemId matches specific route names and skip if so
  // This check might be redundant if route order is correct in the main router file,
  // but can act as a safeguard.
  if (req.params.itemId === "reorder" || req.params.itemId === "breakdown") {
    next();
    return;
  }

  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { itemId } = req.params;
    const { title } = req.body;

    if (!userId || !supabaseUserClient || !itemId) {
      res.status(400).json({ message: "Missing user auth or item ID" });
      return;
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      res
        .status(400)
        .json({ message: "Missing or invalid required field: title" });
      return;
    }

    const { data: updatedTodo, error: updateError } = await supabaseUserClient
      .from("manual_todo_items")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) {
      if (
        updateError.code === "PGRST116" ||
        updateError.message.includes("constraint")
      ) {
        res
          .status(404)
          .json({ message: "Todo item not found or update forbidden" });
        return;
      }
      throw updateError;
    }

    if (!updatedTodo) {
      res
        .status(404)
        .json({ message: "Todo item not found after update attempt" });
      return;
    }

    console.log(`Updated todo item ${itemId} title for user ${userId}`);
    const resultTodo: TodoItem = { ...updatedTodo, sourceProvider: "manual" };
    res.status(200).json(resultTodo);
  } catch (err: unknown) {
    console.error("Server error updating todo item title:", err);
    next(err);
  }
};
