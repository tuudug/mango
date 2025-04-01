import express, { Response, Router, NextFunction } from "express"; // Removed Request
import passport from "passport";
import { supabaseAdmin } from "../supabaseClient"; // For disconnect logic
// Import shared middleware and the exported interface
import { ensureAuthenticated, AuthenticatedRequest } from "../middleware/auth";

const router: Router = express.Router();

// Middleware to check if user is authenticated via Passport session
const ensureSessionAuthenticated = (
  req: AuthenticatedRequest, // Use AuthenticatedRequest to access req.isAuthenticated
  res: Response,
  next: NextFunction
) => {
  // Check if req.isAuthenticated exists (added by Passport) and returns true
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  console.error("Session Auth Error: User not authenticated via session.");
  // Redirect to login or send error? Sending error for API consistency.
  res.status(401).json({ message: "User session not authenticated." });
};

// Route to start the Google OAuth flow
// GET /api/auth/google/start
router.get(
  "/google/start",
  ensureSessionAuthenticated, // Check for Passport session instead of JWT
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Use AuthenticatedRequest
    // Store the Supabase user ID (from Passport session) in the session BEFORE initiating OAuth
    // req.user should be populated by deserializeUser with { id: '...' }
    const userIdFromSession = req.user?.id; // Access req.user directly

    if (userIdFromSession) {
      // Access req.session directly (added by express-session)
      req.session.supabaseUserId = userIdFromSession;
      console.log(
        `Storing supabaseUserId (${userIdFromSession}) in session for Google OAuth link.`
      );
      // Proceed to Passport authentication
      passport.authenticate("google", {
        accessType: "offline", // Request refresh token
        prompt: "consent", // Force consent screen to ensure refresh token is granted
        // scope is defined in the strategy config
      })(req, res, next); // Call passport.authenticate middleware
    } else {
      // Should not happen if ensureSessionAuthenticated works, but handle defensively
      console.error(
        "Error starting Google OAuth: User ID not found in session/req.user."
      );
      res.status(401).json({ message: "User session invalid." });
    }
  }
);

// Google OAuth callback route
const frontendBaseUrl =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173"; // Default if not set

// Google OAuth callback route
// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${frontendBaseUrl}/login-failure`, // Use full frontend URL
    successRedirect: `${frontendBaseUrl}/auth-success`, // Use full frontend URL
    // session: true // Default is true, stores user in session via serializeUser
  })
  // Callback removed as successRedirect handles the flow
);

// --- Google Health Routes ---

// Route to start the Google Health OAuth flow
router.get(
  "/google-health/start",
  ensureSessionAuthenticated, // Check for Passport session
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userIdFromSession = req.user?.id;
    if (userIdFromSession) {
      req.session.supabaseUserId = userIdFromSession; // Store ID for callback linking
      console.log(
        `Storing supabaseUserId (${userIdFromSession}) in session for Google Health OAuth link.`
      );
      // Use the 'google-health' strategy
      const authOptions: passport.AuthenticateOptions & {
        accessType?: string;
        prompt?: string;
      } = {
        accessType: "offline",
        prompt: "consent",
      };
      passport.authenticate("google-health", authOptions)(req, res, next);
    } else {
      console.error(
        "Error starting Google Health OAuth: User ID not found in session/req.user."
      );
      res.status(401).json({ message: "User session invalid." });
    }
  }
);

// Google Health OAuth callback route
router.get(
  "/google-health/callback",
  passport.authenticate("google-health", {
    // Use the 'google-health' strategy
    failureRedirect: `${frontendBaseUrl}/login-failure`, // Redirect to frontend failure page
    successRedirect: `${frontendBaseUrl}/auth-success`, // Redirect to frontend success page
  })
);

// --- Session Login ---

// Route to establish a server-side session after frontend Supabase auth
router.post(
  "/session-login",
  ensureAuthenticated, // Requires valid Supabase JWT
  (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // req.userId is attached by ensureAuthenticated
    const userId = req.userId;
    if (!userId) {
      // Should not happen if ensureAuthenticated works
      res
        .status(401)
        .json({ message: "User ID not found after JWT validation." });
      return; // Explicitly return void
    }

    // Create the user object expected by serializeUser
    const userToSerialize = { id: userId };

    // Use req.login() provided by Passport to establish the session
    if (req.login) {
      req.login(userToSerialize, (err) => {
        if (err) {
          console.error(
            "Error establishing Passport session via req.login:",
            err
          );
          return next(err); // Pass error to global handler
        }
        console.log(`Passport session established for user ID: ${userId}`);
        res.status(200).json({ message: "Session established successfully." });
      });
    } else {
      console.error("req.login function is not available");
      res
        .status(500)
        .json({ message: "Session setup failed - internal error" });
    }
  }
);

// Define handler function separately
const handleGoogleDisconnect = async (
  req: AuthenticatedRequest, // Use AuthenticatedRequest (JWT middleware applied below)
  res: Response,
  next: NextFunction // Add next for error handling
) => {
  // For disconnect, we still want JWT authentication to ensure the correct user is making the request
  const userId = req.userId; // Get userId from ensureAuthenticated (JWT) middleware

  if (!userId) {
    // This check should be handled by ensureAuthenticated, but keep for safety
    res.status(401).json({ message: "User not authenticated via JWT" });
    return; // Explicitly return void
  }

  try {
    console.log(`Disconnecting Google Calendar for user: ${userId}`);
    const { error } = await supabaseAdmin
      .from("data_source_connections")
      .delete()
      .eq("user_id", userId)
      .eq("provider", "google_calendar");

    if (error) {
      console.error("Error disconnecting Google account:", error);
      // Pass the error to the global handler instead of returning response directly
      next(
        error || new Error("Supabase error during Google account disconnect")
      );
      return; // Explicitly return void
    }

    // Optional: Could also revoke the token via Google API here

    // **TODO: Clear relevant session data if needed**
    // req.logout(); // If using passport logout

    console.log(
      `Successfully disconnected Google Calendar for user: ${userId}`
    );
    res
      .status(200)
      .json({ message: "Google account disconnected successfully" });
  } catch (err) {
    console.error("Server error during disconnect:", err);
    // Pass error to the global error handler
    next(err);
  }
};

// Route to disconnect Google account
// POST /api/auth/google/disconnect
router.post(
  "/google/disconnect",
  ensureAuthenticated, // Ensure user is logged in
  handleGoogleDisconnect // No need for asyncHandler if errors are passed to next()
);

// TODO: Add route for checking auth status?
// router.get('/status', (req, res) => { ... });

export default router;
