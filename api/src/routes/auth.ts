import express, { Router } from "express";
import { ensureAuthenticated } from "../middleware/auth"; // JWT auth
import {
  ensureSessionAuthenticated,
  googleStartHandler,
} from "./auth/googleStart"; // Session auth + handler
import { googleCallbackHandler } from "./auth/googleCallback";
import { googleHealthStartHandler } from "./auth/googleHealthStart";
import { googleHealthCallbackHandler } from "./auth/googleHealthCallback";
import { sessionLoginHandler } from "./auth/sessionLogin";
import { handleGoogleDisconnect } from "./auth/googleDisconnect";

const router: Router = express.Router();

// --- Google Calendar Auth ---
router.get(
  "/google/start",
  ensureSessionAuthenticated, // Requires Passport session
  googleStartHandler
);
router.get("/google/callback", googleCallbackHandler); // Handles session via Passport middleware

// --- Google Health Auth ---
router.get(
  "/google-health/start",
  ensureSessionAuthenticated, // Requires Passport session
  googleHealthStartHandler
);
router.get("/google-health/callback", googleHealthCallbackHandler); // Handles session via Passport middleware

// --- Session Management ---
router.post(
  "/session-login",
  ensureAuthenticated, // Requires JWT
  sessionLoginHandler
);

// --- Disconnect ---
router.post(
  "/google/disconnect",
  ensureAuthenticated, // Requires JWT
  handleGoogleDisconnect
);

// TODO: Add route for checking auth status?
// router.get('/status', (req, res) => { ... });

export default router;
