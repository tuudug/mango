import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { awardXpToUser } from "../../services/userProgressService";
import {
  InternalServerError,
  AuthenticationError,
  ValidationError,
} from "../../utils/errors";
// Database type not strictly needed here

export async function addXp(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const { amount } = req.body;

  try {
    const userId = req.user?.id;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    // Input validation
    if (
      typeof amount !== "number" ||
      !Number.isInteger(amount) ||
      amount <= 0
    ) {
      return next(
        new ValidationError(
          "Invalid XP amount provided. Amount must be a positive integer."
        )
      );
    }

    // Call the service function
    const result = await awardXpToUser(userId, amount, supabase);

    if (!result.success) {
      // The service should ideally throw specific errors, but if it returns a message:
      const errorMessage = result.error || "Failed to award XP.";
      console.error(
        `XP Award Service Error for user ${userId}: ${errorMessage}`
      );
      // Map known service errors to appropriate AppErrors
      if (errorMessage === "Invalid XP amount.") {
        return next(new ValidationError(errorMessage));
      }
      // Default to InternalServerError for other service failures
      return next(new InternalServerError(errorMessage));
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
    // Catch unexpected errors from the service call or response handling
    console.error("Unexpected error in addXp handler:", error);
    // Check if it's an AppError thrown by the service (if service is refactored later)
    // if (error instanceof AppError) {
    //   return next(error);
    // }
    // Otherwise, wrap in InternalServerError
    next(
      new InternalServerError("An unexpected error occurred while awarding XP.")
    );
  }
}
