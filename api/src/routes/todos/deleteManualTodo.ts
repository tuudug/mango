import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

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

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    if (!itemId) {
      return next(new BadRequestError("Missing required parameter: itemId"));
    }

    // Use REQUEST-SCOPED client to delete (Cascade delete handles children in DB)
    const { error } = await supabaseUserClient
      .from("manual_todo_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      // Check for specific PostgREST error code for not found / RLS violation
      // PGRST116 often means 0 rows affected by delete/update due to RLS or filter
      if (error.code === "PGRST116") {
        console.warn(
          `Todo item ${itemId} not found or delete forbidden for user ${userId}.`
        );
        return next(
          new NotFoundError("Todo item not found or delete forbidden")
        );
      }
      // For other DB errors, throw InternalServerError
      console.error(
        `Supabase error deleting todo ${itemId} for user ${userId}:`,
        error
      );
      return next(new InternalServerError("Failed to delete todo item"));
    }

    console.log(`Manual todo item ${itemId} deleted for user ${userId}`);
    res.status(200).json({ message: "Todo item deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual todo item:", err);
    next(err);
  }
};
