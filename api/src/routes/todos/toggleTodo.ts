import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { TodoItem } from "../../types/todo";
import { updateQuestProgress } from "../../services/questService"; // Import quest service
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

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

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    if (!itemId) {
      return next(new BadRequestError("Missing required parameter: itemId"));
    }

    // 1. Fetch the current item to get its completion status
    const { data: currentItem, error: fetchError } = await supabaseUserClient
      .from("manual_todo_items")
      .select("is_completed")
      .eq("id", itemId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error(
        `Supabase error fetching todo ${itemId} for user ${userId}:`,
        fetchError
      );
      return next(new InternalServerError("Failed to fetch todo item"));
    }

    if (!currentItem) {
      return next(
        new NotFoundError("Todo item not found or not owned by user")
      );
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

    if (updateError) {
      console.error(
        `Supabase error updating todo ${itemId} for user ${userId}:`,
        updateError
      );
      return next(new InternalServerError("Failed to update todo item"));
    }

    console.log(
      `Toggled todo item ${itemId} to ${newStatus} for user ${userId}`
    );
    const resultTodo: TodoItem = { ...updatedTodo, sourceProvider: "manual" };

    // Send response first
    res.status(200).json(resultTodo);

    // If the todo was marked as complete, update quest progress
    if (newStatus === true) {
      const userTimezone = (req.headers["x-user-timezone"] as string) || "UTC";
      updateQuestProgress(
        userId,
        "todo_complete",
        { count: 1 }, // Increment by 1 for each completed todo
        userTimezone,
        supabaseUserClient
      ).catch((questError) => {
        // Log errors from quest progress update, but don't fail the original request
        console.error(
          `[Quest Progress Update Error] Failed after completing todo ${itemId}:`,
          questError
        );
      });
    }
  } catch (err: unknown) {
    console.error("Server error toggling todo item:", err);
    // Ensure response is sent even if quest update call setup fails
    if (!res.headersSent) {
      next(err); // Pass error to error handling middleware if response not sent
    }
    next(err);
  }
};
