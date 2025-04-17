import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase"; // Keep for UserSettings type
import { InternalServerError, AuthenticationError } from "../../utils/errors";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export const getUserSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    const { data, error, status } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    // Handle specific Supabase errors
    if (error && status !== 406) {
      // 406 Not Acceptable is expected from maybeSingle() if no row is found.
      // Treat other errors as internal.
      console.error("Supabase error fetching user settings:", error);
      return next(new InternalServerError("Failed to fetch user settings."));
    }

    // If no settings row found (status 406 or data is null), return null.
    // This is expected behavior, not an error.
    if (!data) {
      console.log(
        `[GetUserSettings] No settings found for user ${userId}, returning null.`
      );
      res.status(200).json(null);
      return;
    }

    // Successfully fetched settings
    res.status(200).json(data as UserSettings);
  } catch (err) {
    // Catch unexpected errors
    console.error("Unexpected error in getUserSettings handler:", err);
    next(err); // Pass to global error handler
  }
};
