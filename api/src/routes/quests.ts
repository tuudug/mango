import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Correct path relative to routes directory

// Import quest handlers
import { getQuests } from "./quests/getQuests";
import { activateQuest } from "./quests/activateQuest";
import { cancelQuest } from "./quests/cancelQuest";
import { claimQuest } from "./quests/claimQuest";

// Import testing handlers
import { setQuestClaimable } from "./quests/setQuestClaimable";
import { setCriterionMet } from "./quests/setCriterionMet";

const router = Router();

// --- Core User Routes ---
router.get("/", ensureAuthenticated, getQuests);
router.post("/:questId/activate", ensureAuthenticated, activateQuest);
router.post("/:questId/cancel", ensureAuthenticated, cancelQuest);
router.post("/:questId/claim", ensureAuthenticated, claimQuest);

// --- Testing-Only Routes ---
// These should ideally be wrapped in an additional check (e.g., NODE_ENV !== 'production')
// or use a separate router mounted only in development/testing environments.
// For simplicity here, we rely on the internal check within the handlers.
router.post("/:questId/set-claimable", ensureAuthenticated, setQuestClaimable);
router.post(
  "/criteria/:criterionId/set-met",
  ensureAuthenticated,
  setCriterionMet
);

export default router;
