import passport from "passport";

const frontendBaseUrl =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173"; // Default if not set

export const googleHealthCallbackHandler = passport.authenticate(
  "google-health",
  {
    // Use the 'google-health' strategy
    failureRedirect: `${frontendBaseUrl}/login-failure`, // Redirect to frontend failure page
    successRedirect: `${frontendBaseUrl}/auth-success`, // Redirect to frontend success page
  }
);
