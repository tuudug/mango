import express from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Corrected import name
import { getDashboardLayoutHandler } from "./dashboards/getDashboardLayout";
import { upsertDashboardLayoutHandler } from "./dashboards/upsertDashboardLayout";

const router = express.Router();

// Middleware to ensure user is authenticated for all dashboard routes
router.use(ensureAuthenticated); // Corrected usage

// GET /api/dashboards/:name - Fetch a specific dashboard layout
router.get("/:name", getDashboardLayoutHandler);

// PUT /api/dashboards/:name - Create or update a dashboard layout
router.put("/:name", upsertDashboardLayoutHandler);

// Optional: GET /api/dashboards - List all dashboard names for the user
// router.get('/', listDashboardNamesHandler); // Handler to be created if needed

export default router;
