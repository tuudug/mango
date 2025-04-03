import { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth"; // Correct import name
import { getFinanceSettings } from "./finance/getFinanceSettings";
import { upsertFinanceSettings } from "./finance/upsertFinanceSettings";
import { getTodaysFinanceEntries } from "./finance/getTodaysFinanceEntries";
import { addFinanceEntry } from "./finance/addFinanceEntry";
import { deleteFinanceEntry } from "./finance/deleteFinanceEntry";
import { getWeeklyExpenses } from "./finance/getWeeklyExpenses"; // Import weekly handler

const router = Router();

// Apply auth middleware to all finance routes
router.use(ensureAuthenticated); // Use correct function name

// Settings routes
router.get("/settings", getFinanceSettings);
router.put("/settings", upsertFinanceSettings);

// Entry routes
router.get("/entries/today", getTodaysFinanceEntries);
router.get("/entries/weekly", getWeeklyExpenses); // Add weekly route
router.post("/entries", addFinanceEntry);
router.delete("/entries/:id", deleteFinanceEntry);

export default router;
