import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // For disconnect logic
import { AuthenticatedRequest } from "../../middleware/auth";

// Define expected provider types
type ProviderType = "google_calendar" | "google_health"; // Add more as needed

export const handleGoogleDisconnect = async (
  req: AuthenticatedRequest, // Use AuthenticatedRequest (JWT middleware applied below)
  res: Response,
  next: NextFunction // Add next for error handling
) => {
  const userId = req.userId; // Get userId from ensureAuthenticated (JWT) middleware
  const { provider } = req.body as { provider: ProviderType }; // Get provider from request body

  if (!userId) {
    // This check should be handled by ensureAuthenticated, but keep for safety
    res.status(401).json({ message: "User not authenticated via JWT" });
    return;
  }

  // Validate provider type
  if (
    !provider ||
    (provider !== "google_calendar" && provider !== "google_health")
  ) {
    res
      .status(400)
      .json({
        message:
          "Invalid or missing provider type in request body. Must be 'google_calendar' or 'google_health'.",
      });
    return;
  }

  try {
    console.log(`Disconnecting ${provider} for user: ${userId}`);
    const { error, count } = await supabaseAdmin
      .from("data_source_connections")
      .delete({ count: "exact" }) // Request count of deleted rows
      .eq("user_id", userId)
      .eq("provider", provider); // Use the provider from the request body

    if (error) {
      console.error(`Error disconnecting ${provider} account:`, error);
      next(
        error ||
          new Error(`Supabase error during ${provider} account disconnect`)
      );
      return;
    }

    if (count === 0) {
      console.warn(
        `No ${provider} connection found to disconnect for user: ${userId}`
      );
      // Still return success as the desired state (disconnected) is achieved
    } else {
      console.log(
        `Successfully disconnected ${provider} for user: ${userId} (deleted ${count} record(s))`
      );
    }

    // Optional: Could also revoke the token via Google API here (but would need decryption)
    // Since we might have decryption issues, skipping revocation is safer for now.

    res
      .status(200)
      .json({ message: `${provider} account disconnected successfully` });
  } catch (err) {
    console.error(`Server error during ${provider} disconnect:`, err);
    next(err);
  }
};
