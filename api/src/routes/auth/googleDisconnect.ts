import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // For disconnect logic
import { AuthenticatedRequest } from "../../middleware/auth";

export const handleGoogleDisconnect = async (
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
      .eq("provider", "google_calendar"); // Specific to Google Calendar disconnect

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
