import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { supabaseAdmin } from "../../supabaseClient"; // Adjust path

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

export const addManualTodoHandler = async (
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
    const { title, due_date, parent_id } = req.body;
    if (!title) {
      res.status(400).json({ message: "Missing required field: title" });
      return;
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

      if (parentError || !parentTodo) {
        console.error("Error fetching parent todo:", parentError);
        res.status(404).json({
          message: "Parent todo item not found or not owned by user",
        });
        return;
      }
      parentLevel = parentTodo.level;
      connectionId = parentTodo.connection_id;

      if (parentLevel >= MAX_TODO_LEVEL) {
        res.status(400).json({
          message: `Cannot add sub-item beyond level ${MAX_TODO_LEVEL}`,
        });
        return;
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

      if (connError || !connection?.id) {
        console.error(
          "Error finding/creating manual_todos connection:",
          connError
        );
        throw (
          connError || new Error("Manual todos connection ID not found/created")
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

    if (countError) throw countError;

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

    if (insertError) throw insertError;

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
