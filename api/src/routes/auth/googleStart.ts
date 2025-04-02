import { Response, NextFunction } from "express";
import passport from "passport";
import { AuthenticatedRequest } from "../../middleware/auth";

// Middleware to check if user is authenticated via Passport session
export const ensureSessionAuthenticated = (
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

export const googleStartHandler = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
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
};
