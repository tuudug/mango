import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { TodoItem } from "../../types/todo";

export const toggleTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Check if itemId matches specific route names and skip if so
  if (req.params.itemId === "reorder" || req.params.itemId === "breakdown") {
    next();
    return;
  }

  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;
    const { itemId } = req.params;

    if (!userId || !supabaseUserClient || !itemId) {
      res.status(400).json({ message: "Missing user auth or item ID" });
      return;
    }

    // 1. Fetch the current item to get its completion status
    const { data: currentItem, error: fetchError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("is_completed")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!currentItem) {
      res
        .status(404)
        .json({ message: "Todo item not found or not owned by user" });
      return;
    }

    // 2. Update the item with the toggled status
    const newStatus = !currentItem.is_completed;
    const { data: updatedTodo, error: updateError } = await supabaseUserClient
      .from("manual_todo_items")
      .update({
        is_completed: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", userId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log(
      `Toggled todo item ${itemId} to ${newStatus} for user ${userId}`
    );
    const resultTodo: TodoItem = { ...updatedTodo, sourceProvider: "manual" };
    res.status(200).json(resultTodo);
  } catch (err: unknown) {
    console.error("Server error toggling todo item:", err);
    next(err);
  }
};
