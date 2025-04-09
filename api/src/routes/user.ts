import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Corrected path
import { addXp } from "./user/addXp";

const router = Router();

// Route to add XP
router.post("/progress/add-xp", ensureAuthenticated, addXp);

// Add other user-related routes here in the future

export default router;
