import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { awardXpToUser } from "../../services/userProgressService"; // Import the service function
import { Database } from "../../types/supabase"; // Import Database type for Supabase client

export async function addXp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { amount } = req.body;
  const userId = req.user?.id;
  // Explicitly type supabase client when getting it from request
  const supabase = req.supabase as AuthenticatedRequest["supabase"];

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  // Input validation remains here
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    res.status(400).json({
      message: "Invalid XP amount provided. Amount must be a positive integer.",
    });
    return;
  }

  try {
    // Call the service function to handle XP awarding and level calculation
    const result = await awardXpToUser(userId, amount, supabase);

    if (!result.success) {
      // Use the error message from the service if available
      const errorMessage = result.error || "Failed to award XP.";
      // Determine appropriate status code based on error type if needed
      const statusCode = errorMessage === "Invalid XP amount." ? 400 : 500;
      res.status(statusCode).json({ message: errorMessage });
      return; // Return early on failure
    }

    // Construct success message
    let message = `Added ${amount} XP. New total: ${result.newXp}.`;
    if (result.levelUp) {
      message += ` Level up! Reached Level ${result.newLevel}.`;
    }

    res.status(200).json({
      success: true,
      message: message,
      newXp: result.newXp,
      newLevel: result.newLevel,
    });
  } catch (error) {
    // Catch any unexpected errors during service call or response handling
    console.error("Unexpected error in addXp handler:", error);
    next(error); // Pass to global error handler
  }
}
