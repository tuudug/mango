import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { TodoItem } from "../../types/todo";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors"; // Import custom errors

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

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    if (!itemId) {
      return next(new BadRequestError("Missing required parameter: itemId"));
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      return next(
        new ValidationError("Missing or invalid required field: title")
      );
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
      // Check for specific PostgREST error code for not found / RLS violation
      // PGRST116 often means 0 rows affected by delete/update due to RLS or filter
      if (updateError.code === "PGRST116") {
        console.warn(
          `Todo item ${itemId} not found or update forbidden for user ${userId}.`
        );
        return next(
          new NotFoundError("Todo item not found or update forbidden")
        );
      }
      // For other DB errors, throw InternalServerError
      console.error(
        `Supabase error updating todo ${itemId} for user ${userId}:`,
        updateError
      );
      return next(new InternalServerError("Failed to update todo item"));
    }

    // Although .single() should throw if no row is returned after a successful update,
    // add a safety check.
    if (!updatedTodo) {
      console.error(
        `Todo item ${itemId} not found after successful update attempt for user ${userId}. This should not happen.`
      );
      return next(
        new InternalServerError("Todo item disappeared after update attempt")
      );
    }

    console.log(`Updated todo item ${itemId} title for user ${userId}`);
    const resultTodo: TodoItem = { ...updatedTodo, sourceProvider: "manual" };
    res.status(200).json(resultTodo);
  } catch (err: unknown) {
    console.error("Server error updating todo item title:", err);
    next(err);
  }
};
