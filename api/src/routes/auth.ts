import express, { Request, Response, Router, NextFunction } from "express"; // Add NextFunction
import passport from "passport";
import { supabaseAdmin } from "../supabaseClient"; // For disconnect logic

const router: Router = express.Router();

// Route to start the Google OAuth flow
// GET /api/auth/google/start
router.get(
  "/google/start",
  // Add options here to request offline access (for refresh token) and force consent screen
  passport.authenticate("google", {
    accessType: "offline",
    prompt: "consent",
    // scope is already defined in the strategy config
  })
);

// Google OAuth callback route
// GET /api/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login-failure", // TODO: Define a real failure route/page in frontend
    successRedirect: "/auth-success", // TODO: Define a real success route/page in frontend
    // session: true // Default is true, stores user in session via serializeUser
  }),
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (req: Request, res: Response) => {
    // This function only runs on successful authentication
    console.log("Google OAuth callback successful. Redirecting...");
    // Redirect is handled by successRedirect option above
    // res.redirect('/'); // Or redirect to a specific dashboard page
  }
);

// Define handler function separately
const handleGoogleDisconnect = async (req: Request, res: Response) => {
  // **TODO: Add authentication middleware to ensure user is logged in**
  // const userId = req.user?.id; // Assuming req.user is populated by deserializeUser
  const userId = "PLACEHOLDER_USER_ID"; // Replace with actual user ID logic

  if (!userId || userId === "PLACEHOLDER_USER_ID") {
    return res.status(401).json({ message: "User not authenticated" });
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
      return res
        .status(500)
        .json({ message: "Failed to disconnect Google account" });
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
    res.status(500).json({ message: "Internal server error" });
  }
};

// Helper to wrap async route handlers
const asyncHandler =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<void | Response>
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next); // Catch errors and pass to Express error handler
  };

// Route to disconnect Google account (example - requires user to be logged into our app)
// POST /api/auth/google/disconnect
router.post("/google/disconnect", asyncHandler(handleGoogleDisconnect)); // Wrap the handler

// TODO: Add route for checking auth status?
// router.get('/status', (req, res) => { ... });

export default router;
