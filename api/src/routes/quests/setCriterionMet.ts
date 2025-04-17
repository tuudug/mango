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
export async function setCriterionMet(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { criterionId } = req.params;

  // Basic security check - Keep this as is, using AuthorizationError
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

    if (!criterionId) {
      return next(new BadRequestError("Criterion ID is required."));
    }

    // 1. Verify criterion ownership via the parent quest
    const { data: criterionCheck, error: checkError } = await supabase
      .from("quest_criteria")
      .select(
        `
        id,
        quest:quests ( user_id )
      `
      )
      .eq("id", criterionId)
      .single();

    if (checkError) {
      console.error(
        "Supabase error checking criterion ownership (testing):",
        checkError
      );
      if (checkError.code === "PGRST116") {
        return next(new NotFoundError("Criterion not found."));
      }
      return next(
        new InternalServerError(
          "Failed to check criterion ownership (testing)."
        )
      );
    }

    const ownerId = (criterionCheck as any)?.quest?.user_id;
    if (!ownerId || ownerId !== userId) {
      return next(
        new AuthorizationError(
          "You do not own the quest associated with this criterion."
        )
      );
    }

    // 2. Update the criterion status directly to 'is_met = true'
    const { data: updatedCriterion, error: updateError } = await supabase
      .from("quest_criteria")
      .update({ is_met: true })
      .eq("id", criterionId)
      .select()
      .single();

    if (updateError) {
      console.error(
        "Supabase error setting criterion met (testing):",
        updateError
      );
      if (updateError.code === "PGRST116") {
        // Should not happen if check passed, but handle defensively
        return next(new NotFoundError("Criterion not found during update."));
      }
      return next(
        new InternalServerError("Failed to set criterion met (testing).")
      );
    }

    // If updateError is null, .single() guarantees data is not null
    // The check below is redundant if PGRST116 is handled above.
    // if (!updatedCriterion) { ... }

    res.status(200).json({
      message: "Criterion status set to met (testing only).",
      criterion: updatedCriterion,
    });
  } catch (error) {
    // Catch unexpected errors
    console.error(
      "Unexpected error in setCriterionMet handler (testing):",
      error
    );
    next(error); // Pass to global error handler
  }
}
