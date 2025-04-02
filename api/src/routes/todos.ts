import express, { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";

// Import route handlers
import { getTodosHandler } from "./todos/getTodos";
import { addManualTodoHandler } from "./todos/addManualTodo";
import { deleteManualTodoHandler } from "./todos/deleteManualTodo";
import { toggleTodoHandler } from "./todos/toggleTodo";
import { editManualTodoHandler } from "./todos/editManualTodo";
import { reorderTodosHandler } from "./todos/reorderTodos";
import { breakdownTodoHandler } from "./todos/breakdownTodo";
import { moveTodoHandler } from "./todos/moveTodo"; // Import the new handler

const router: Router = express.Router();

// --- Routes ---

// GET /api/todos - Fetch all todo items for the user
router.get("/", ensureAuthenticated, getTodosHandler);

// POST /api/todos/manual - Add a manual todo item
router.post("/manual", ensureAuthenticated, addManualTodoHandler);

// PUT /api/todos/manual/reorder - Reorder items within a parent (or top level)
router.put("/manual/reorder", ensureAuthenticated, reorderTodosHandler);

// PUT /api/todos/manual/:itemId - Edit a manual todo item's title
router.put("/manual/:itemId", ensureAuthenticated, editManualTodoHandler);

// PUT /api/todos/manual/:itemId/toggle - Toggle completion status
router.put("/manual/:itemId/toggle", ensureAuthenticated, toggleTodoHandler);

// PUT /api/todos/manual/:itemId/move - Move item up/down within siblings
router.put("/manual/:itemId/move", ensureAuthenticated, moveTodoHandler); // Add the new route

// POST /api/todos/manual/:itemId/breakdown - Generate sub-tasks using AI
router.post(
  "/manual/:itemId/breakdown",
  ensureAuthenticated,
  breakdownTodoHandler
);

// DELETE /api/todos/manual/:itemId - Delete a manual todo item
router.delete("/manual/:itemId", ensureAuthenticated, deleteManualTodoHandler);

export default router;
