import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase"; // Import Database type

export async function getUserProgress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  // Explicitly type supabase client
  const supabase = req.supabase as AuthenticatedRequest["supabase"];

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    const { data: userProgress, error: fetchError } = await supabase
      .from("user_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116: row not found, treat as error here as progress should exist if user logged in
      console.error("Error fetching user progress:", fetchError);
      return next(new Error("Failed to fetch user progress."));
    }

    // If no progress record found (PGRST116), return default values
    const progressData = userProgress ?? { xp: 0, level: 1 };

    res.status(200).json(progressData);
  } catch (error) {
    console.error("Unexpected error fetching user progress:", error);
    next(error);
  }
}
