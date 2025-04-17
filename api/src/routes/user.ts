import { Router } from "express";
// Removed duplicate import
import { ensureAuthenticated } from "../middleware/auth"; // Corrected path
import { addXp } from "./user/addXp";
import { getUserProgress } from "./user/getUserProgress";
import { updateUserSettings } from "./user/updateSettings";
import { getUserSettings } from "./user/getUserSettings"; // Import the new GET handler
import {
  addPushSubscription,
  deletePushSubscription,
} from "./user/pushSubscriptions"; // Import push subscription handlers

const router = Router();

// Route to add XP
router.post("/progress/add-xp", ensureAuthenticated, addXp);

// Route to get user progress (XP and Level)
router.get("/progress", ensureAuthenticated, getUserProgress);

// Routes for user settings
router.get("/settings", ensureAuthenticated, getUserSettings); // Add GET route
router.put("/settings", ensureAuthenticated, updateUserSettings);

// Routes for managing push notification subscriptions
router.post("/push-subscriptions", ensureAuthenticated, addPushSubscription);
router.delete(
  "/push-subscriptions",
  ensureAuthenticated,
  deletePushSubscription
); // Using DELETE on the collection, identified by endpoint in body

// Add other user-related routes here in the future

export default router;
