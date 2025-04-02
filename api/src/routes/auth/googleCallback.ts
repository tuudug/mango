import passport from "passport";

const frontendBaseUrl =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173"; // Default if not set

export const googleCallbackHandler = passport.authenticate("google", {
  failureRedirect: `${frontendBaseUrl}/login-failure`, // Use full frontend URL
  successRedirect: `${frontendBaseUrl}/auth-success`, // Use full frontend URL
  // session: true // Default is true, stores user in session via serializeUser
});
