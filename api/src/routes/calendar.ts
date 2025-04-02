import express, { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth";
import { getCalendarEvents } from "./calendar/getCalendarEvents";
import { addManualCalendarEvent } from "./calendar/addManualCalendarEvent";
import { deleteManualCalendarEvent } from "./calendar/deleteManualCalendarEvent";

const router: Router = express.Router();

// --- Routes ---

// GET /api/calendar - Fetch merged calendar events
router.get("/", ensureAuthenticated, getCalendarEvents);

// POST /api/calendar/manual - Add a manual event
router.post("/manual", ensureAuthenticated, addManualCalendarEvent);

// DELETE /api/calendar/manual/:eventId - Delete a manual event
router.delete(
  "/manual/:eventId",
  ensureAuthenticated,
  deleteManualCalendarEvent
);

export default router;
