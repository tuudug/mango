import express, { Response, Router, NextFunction } from "express";
import { supabaseAdmin } from "../supabaseClient";
import { ensureAuthenticated, AuthenticatedRequest } from "../middleware/auth";

const router: Router = express.Router();

// --- Types ---
interface TodoItem {
  id: string;
  connection_id: string;
  title: string;
  is_completed: boolean;
  due_date?: string | null; // Comes as string or null from DB
  created_at: string;
  updated_at: string;
  sourceProvider: "manual"; // Only manual for now
}

// --- Routes ---

// GET /api/todos - Fetch all manual todo items for the user
router.get(
  "/",
  ensureAuthenticated,
  async (
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

      // Fetch Manual Todos (Use request-scoped client - RLS applies)
      const { data: manualTodos, error: manualError } = await supabaseUserClient
        .from("manual_todo_items")
        .select(
          "id, connection_id, title, is_completed, due_date, created_at, updated_at"
        )
        .eq("user_id", userId);

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

      // TODO: Later, fetch from external providers (e.g., Google Tasks)

      res.status(200).json({ todoItems: allTodoItems });
    } catch (error) {
      console.error("Error in GET /api/todos handler:", error);
      next(error);
    }
  }
);

// POST /api/todos/manual - Add a manual todo item
router.post(
  "/manual",
  ensureAuthenticated,
  async (
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
      const { title, due_date } = req.body; // is_completed defaults to false
      if (!title) {
        res.status(400).json({ message: "Missing required field: title" });
        return;
      }

      // Find or create the 'manual_todos' connection using ADMIN client
      const { data: connection, error: connError } = await supabaseAdmin
        .from("data_source_connections")
        .upsert(
          {
            user_id: userId,
            provider: "manual_todos", // Consistent provider name
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

      // Insert the manual todo item using the REQUEST-SCOPED client
      const { data: newTodo, error: insertError } = await supabaseUserClient
        .from("manual_todo_items")
        .insert({
          user_id: userId,
          connection_id: connection.id,
          title,
          due_date: due_date || null, // Handle optional due date
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log(`Manual todo item added for user ${userId}:`, newTodo);
      // Return the newly created item with sourceProvider added
      const resultTodo: TodoItem = { ...newTodo, sourceProvider: "manual" };
      res.status(201).json(resultTodo);
    } catch (err: unknown) {
      console.error("Server error adding manual todo item:", err);
      next(err);
    }
  }
);

// PUT /api/todos/manual/:itemId/toggle - Toggle completion status
router.put(
  "/manual/:itemId/toggle",
  ensureAuthenticated,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
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
        .maybeSingle(); // Use maybeSingle to handle not found

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
  }
);

// DELETE /api/todos/manual/:itemId - Delete a specific manual todo item
router.delete(
  "/manual/:itemId",
  ensureAuthenticated,
  async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.userId;
      const supabaseUserClient = req.supabase;
      const { itemId } = req.params;

      if (!userId || !supabaseUserClient || !itemId) {
        res.status(400).json({ message: "Missing user auth or item ID" });
        return;
      }

      // Use REQUEST-SCOPED client to delete
      const { error } = await supabaseUserClient
        .from("manual_todo_items")
        .delete()
        .eq("id", itemId)
        .eq("user_id", userId);

      if (error) {
        if (error.code === "PGRST204") {
          // Not found / not owned
          res
            .status(404)
            .json({ message: "Todo item not found or not owned by user" });
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
  }
);

export default router;
