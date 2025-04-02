import express, { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Corrected path

// Import handlers from individual files
import { getTodosHandler } from "./todos/getTodos";
import { addManualTodoHandler } from "./todos/addManualTodo";
import { reorderTodosHandler } from "./todos/reorderTodos";
import { breakdownTodoHandler } from "./todos/breakdownTodo";
import { editManualTodoHandler } from "./todos/editManualTodo";
import { toggleTodoHandler } from "./todos/toggleTodo";
import { deleteManualTodoHandler } from "./todos/deleteManualTodo";

const router: Router = express.Router();

// --- Define Routes using imported handlers ---

// GET /api/todos - Fetch all items
router.get("/", ensureAuthenticated, getTodosHandler);

// POST /api/todos/manual - Add a manual item (top-level or sub-item)
router.post("/manual", ensureAuthenticated, addManualTodoHandler);

// --- IMPORTANT: Define specific routes BEFORE parameterized routes ---

// PUT /api/todos/manual/reorder - Reorder items within a parent (or top-level)
router.put("/manual/reorder", ensureAuthenticated, reorderTodosHandler);

// POST /api/todos/manual/:itemId/breakdown - Generate sub-items using AI
router.post(
  "/manual/:itemId/breakdown",
  ensureAuthenticated,
  breakdownTodoHandler
);

// PUT /api/todos/manual/:itemId - Edit an item's title
router.put("/manual/:itemId", ensureAuthenticated, editManualTodoHandler);

// PUT /api/todos/manual/:itemId/toggle - Toggle completion status
router.put("/manual/:itemId/toggle", ensureAuthenticated, toggleTodoHandler);

// DELETE /api/todos/manual/:itemId - Delete an item (and its children via cascade)
router.delete("/manual/:itemId", ensureAuthenticated, deleteManualTodoHandler);

export default router;
