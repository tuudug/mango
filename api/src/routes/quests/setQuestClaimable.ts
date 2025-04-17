import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  AuthorizationError,
} from "../../utils/errors";

// WARNING: This is a testing-only endpoint and should be disabled or secured in production.
export async function setQuestClaimable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { questId } = req.params;

  // Basic security check
  if (process.env.NODE_ENV === "production") {
    return next(
      new AuthorizationError("This testing endpoint is disabled in production.")
    );
  }

  try {
    const userId = req.user?.id;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    if (!questId) {
      return next(new BadRequestError("Quest ID is required."));
    }

    // Update the quest status directly to 'claimable'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "claimable", claimable_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId) // Ensure ownership
      .select(`*, quest_criteria (*)`)
      .single();

    if (updateError) {
      console.error(
        "Supabase error setting quest claimable (testing):",
        updateError
      );
      if (updateError.code === "PGRST116") {
        // Quest not found for this user
        return next(new NotFoundError("Quest not found or access denied."));
      }
      return next(
        new InternalServerError("Failed to set quest claimable (testing).")
      );
    }

    // If updateError is null, .single() guarantees data is not null
    // The check below is redundant if PGRST116 is handled above.
    // if (!updatedQuest) { ... }

    res.status(200).json({
      message: "Quest status set to claimable (testing only).",
      quest: updatedQuest,
    });
  } catch (error) {
    // Catch unexpected errors
    console.error(
      "Unexpected error in setQuestClaimable handler (testing):",
      error
    );
    next(error); // Pass to global error handler
  }
}
