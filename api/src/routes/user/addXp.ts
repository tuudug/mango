import { NextFunction, Response, Request } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function addXp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { amount } = req.body;
  const userId = req.user?.id;
  const supabase = req.supabase; // Assign to variable for check

  // Check for both userId and supabase client
  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({
      message: "Invalid XP amount provided. Amount must be a positive integer.",
    });
    return;
  }

  try {
    // Now safe to use supabase
    const { data: currentProgress, error: fetchError } = await supabase
      .from("user_progress") // Assuming a 'user_progress' table exists
      .select("xp, level")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      // PGRST116: row not found, okay if it's the first time
      console.error("Error fetching user progress:", fetchError);
      // Pass generic errors to the error handler
      return next(new Error("Failed to fetch user progress."));
    }

    const currentXp = currentProgress?.xp ?? 0;
    // const currentLevel = currentProgress?.level ?? 1; // Level calculation logic would go here if needed

    const newXp = currentXp + amount;
    // Potentially calculate newLevel based on newXp and level thresholds

    // Now safe to use supabase
    const { error: updateError } = await supabase.from("user_progress").upsert(
      {
        user_id: userId,
        xp: newXp,
        // level: newLevel, // Update level if calculated
      },
      { onConflict: "user_id" }
    );

    if (updateError) {
      console.error("Error updating user progress:", updateError);
      // Pass generic errors to the error handler
      return next(new Error("Failed to update user progress."));
    }

    res.status(200).json({
      success: true,
      message: `Added ${amount} XP. New total: ${newXp}`,
    });
  } catch (error) {
    console.error("Unexpected error adding XP:", error);
    // Pass unexpected errors to the error handler
    next(error);
  }
}
