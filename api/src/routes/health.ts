import express, { Router, Request, Response, NextFunction } from "express"; // Import Request, Response, NextFunction
import { ensureAuthenticated } from "../middleware/auth";
import { getHealthEntries } from "./health/getHealthEntries";
import { addManualHealthEntry } from "./health/addManualHealthEntry";
import { deleteManualHealthEntry } from "./health/deleteManualHealthEntry";
import { getHealthSettings } from "./health/getHealthSettings";
import { upsertHealthSettings } from "./health/upsertHealthSettings";

const router: Router = express.Router();

// --- Routes ---

// GET /api/health - Fetch merged health entries for the user
router.get("/", ensureAuthenticated, getHealthEntries);

// POST /api/health/manual - Add a manual health entry
router.post("/manual", ensureAuthenticated, addManualHealthEntry);

// DELETE /api/health/manual/:entryId - Delete a specific manual health entry
router.delete("/manual/:entryId", ensureAuthenticated, deleteManualHealthEntry);

// GET /api/health/settings - Fetch user-specific health settings
router.get("/settings", ensureAuthenticated, getHealthSettings);

// PUT /api/health/settings - Upsert user-specific health settings
// Pass the handler directly now that its signature includes next
router.put("/settings", ensureAuthenticated, upsertHealthSettings);

export default router;
