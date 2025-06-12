import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { InternalServerError, AuthenticationError } from "../../utils/errors";
// Database type not strictly needed here

export async function getUserProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    const { data: userProgress, error: fetchError } = await supabase
      .from("user_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .single();

    // Handle specific Supabase errors
    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116 means row not found, which we handle by returning defaults.
      // Other errors are internal server errors.
      console.error("Supabase error fetching user progress:", fetchError);
      return next(new InternalServerError("Failed to fetch user progress."));
    }

    // If no progress record found (PGRST116 or null data), return default values
    const progressData = userProgress ?? { xp: 0, level: 1 };

    res.status(200).json(progressData);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in getUserProgress handler:", error);
    next(error); // Pass to global error handler
  }
}
