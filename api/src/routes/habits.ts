import express from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Correct import name
import { getHabits } from "./habits/getHabits";
import { addHabit } from "./habits/addHabit";
import { updateHabit } from "./habits/updateHabit";
import { deleteHabit } from "./habits/deleteHabit";
import { getHabitEntries } from "./habits/getHabitEntries";
import { addHabitEntry } from "./habits/addHabitEntry";
import { deleteHabitEntry } from "./habits/deleteHabitEntry"; // Import deleteHabitEntry handler

const router = express.Router();

// --- Habit Definitions ---
router.get("/", ensureAuthenticated, getHabits);
router.post("/", ensureAuthenticated, addHabit);
router.put("/:id", ensureAuthenticated, updateHabit);
router.delete("/:id", ensureAuthenticated, deleteHabit);

// --- Habit Entries ---
router.get("/entries", ensureAuthenticated, getHabitEntries);
router.post("/entries", ensureAuthenticated, addHabitEntry);
router.delete("/entries/:entryId", ensureAuthenticated, deleteHabitEntry); // Add DELETE /entries/:entryId route

export default router;
