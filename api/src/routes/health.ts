import express, { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { getHealthEntries } from "./health/getHealthEntries";
import { addManualHealthEntry } from "./health/addManualHealthEntry";
import { deleteManualHealthEntry } from "./health/deleteManualHealthEntry";

const router: Router = express.Router();

// --- Routes ---

// GET /api/health - Fetch merged health entries for the user
router.get("/", ensureAuthenticated, getHealthEntries);

// POST /api/health/manual - Add a manual health entry
router.post("/manual", ensureAuthenticated, addManualHealthEntry);

// DELETE /api/health/manual/:entryId - Delete a specific manual health entry
router.delete("/manual/:entryId", ensureAuthenticated, deleteManualHealthEntry);

export default router;
