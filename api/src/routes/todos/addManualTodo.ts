import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../supabaseClient"; // Adjust path
import { TodoItem } from "../../types/todo";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
  ValidationError,
} from "../../utils/errors"; // Import custom errors

const MAX_TODO_LEVEL = 2; // Consider moving to a shared constants file

export const addManualTodoHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase;

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    const { title, due_date, parent_id } = req.body;
    if (!title) {
      return next(new ValidationError("Missing required field: title"));
    }

    let parentLevel = -1;
    let connectionId: string | null = null;

    if (parent_id) {
      const { data: parentTodo, error: parentError } = await supabaseUserClient
        .from("manual_todo_items")
        .select("level, connection_id")
        .eq("id", parent_id)
        .eq("user_id", userId)
        .single();

      if (parentError) {
        console.error("Supabase error fetching parent todo:", parentError);
        return next(new InternalServerError("Failed to fetch parent todo"));
      }
      if (!parentTodo) {
        return next(
          new NotFoundError("Parent todo item not found or not owned by user")
        );
      }
      parentLevel = parentTodo.level;
      connectionId = parentTodo.connection_id;

      if (parentLevel >= MAX_TODO_LEVEL) {
        return next(
          new BadRequestError(
            `Cannot add sub-item beyond level ${MAX_TODO_LEVEL}`
          )
        );
      }
    } else {
      const { data: connection, error: connError } = await supabaseAdmin
        .from("data_source_connections")
        .upsert(
          {
            user_id: userId,
            provider: "manual_todos",
            account_identifier: "Manual Todos",
          },
          { onConflict: "user_id, provider", ignoreDuplicates: false }
        )
        .select("id")
        .single();

      if (connError) {
        console.error(
          "Supabase error finding/creating manual_todos connection:",
          connError
        );
        return next(
          new InternalServerError(
            "Failed to establish connection for manual todos"
          )
        );
      }
      if (!connection?.id) {
        // This case indicates an unexpected issue with the upsert returning no ID
        console.error(
          "Manual todos connection ID not found/created after upsert"
        );
        return next(
          new InternalServerError(
            "Failed to get connection ID for manual todos"
          )
        );
      }
      connectionId = connection.id;
    }

    if (!connectionId) {
      throw new Error("Could not determine connection ID for new todo");
    }

    const newItemLevel = parentLevel + 1;

    const positionQuery = supabaseUserClient
      .from("manual_todo_items")
      .select("position", { count: "exact", head: false })
      .eq("user_id", userId);

    if (parent_id) {
      positionQuery.eq("parent_id", parent_id);
    } else {
      positionQuery.is("parent_id", null);
    }

    const { count: siblingCount, error: countError } = await positionQuery;

    if (countError) {
      console.error(
        `Supabase error counting siblings for user ${userId}, parent ${parent_id}:`,
        countError
      );
      return next(new InternalServerError("Failed to determine todo position"));
    }

    const nextPosition = (siblingCount || 0) + 1;

    const { data: newTodo, error: insertError } = await supabaseUserClient
      .from("manual_todo_items")
      .insert({
        user_id: userId,
        connection_id: connectionId,
        title,
        due_date: due_date || null,
        parent_id: parent_id || null,
        level: newItemLevel,
        position: nextPosition,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        `Supabase error inserting todo for user ${userId}:`,
        insertError
      );
      return next(new InternalServerError("Failed to add todo item"));
    }

    console.log(
      `Manual todo item added for user ${userId} (Level ${newItemLevel}):`,
      newTodo
    );
    const resultTodo: TodoItem = { ...newTodo, sourceProvider: "manual" };
    res.status(201).json(resultTodo);
  } catch (err: unknown) {
    console.error("Server error adding manual todo item:", err);
    next(err);
  }
};
