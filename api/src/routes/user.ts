import { Router } from "express";
// Removed duplicate import
import { ensureAuthenticated } from "../middleware/auth"; // Corrected path
import { addXp } from "./user/addXp";
import { getUserProgress } from "./user/getUserProgress"; // Import the new handler
import { updateUserSettings } from "./user/updateSettings"; // Import the settings handler

const router = Router();

// Route to add XP
router.post("/progress/add-xp", ensureAuthenticated, addXp);

// Route to get user progress (XP and Level)
router.get("/progress", ensureAuthenticated, getUserProgress);

// Route to update user settings (e.g., notification permission)
router.put("/settings", ensureAuthenticated, updateUserSettings);

// Add other user-related routes here in the future

export default router;
