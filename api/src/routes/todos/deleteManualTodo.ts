import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const deleteManualTodoHandler = async (
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

    // Use REQUEST-SCOPED client to delete (Cascade delete handles children in DB)
    const { error } = await supabaseUserClient
      .from("manual_todo_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      // Check for specific PostgREST error code for not found / RLS violation
      if (error.code === "PGRST116" || error.message.includes("constraint")) {
        res
          .status(404)
          .json({ message: "Todo item not found or delete forbidden" });
        return;
      }
      throw error;
    }

    console.log(`Manual todo item ${itemId} deleted for user ${userId}`);
    res.status(200).json({ message: "Todo item deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual todo item:", err);
    next(err);
  }
};
