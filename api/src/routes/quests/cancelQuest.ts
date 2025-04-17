import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "../../utils/errors";

export async function cancelQuest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const { questId } = req.params;

  try {
    const userId = req.user?.id;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    if (!questId) {
      return next(new BadRequestError("Quest ID is required."));
    }

    // Fetch the quest to verify ownership and status
    const { data: targetQuest, error: fetchError } = await supabase
      .from("quests")
      .select("id, user_id, status")
      .eq("id", questId)
      .single();

    if (fetchError) {
      console.error(
        "Supabase error fetching quest for cancellation:",
        fetchError
      );
      if (fetchError.code === "PGRST116") {
        return next(new NotFoundError("Quest not found."));
      }
      return next(new InternalServerError("Failed to fetch quest details."));
    }

    if (targetQuest.user_id !== userId) {
      return next(new AuthorizationError("You do not own this quest."));
    }

    // Only allow cancelling 'active' quests in this flow
    if (targetQuest.status !== "active") {
      return next(
        new BadRequestError(
          `Quest cannot be cancelled (current status: ${targetQuest.status}). Only active quests can be cancelled.`
        )
      );
    }

    // Update the quest status to 'cancelled'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId)
      .eq("status", "active") // Concurrency check
      .select(`*, quest_criteria (*)`)
      .single();

    if (updateError) {
      console.error("Supabase error cancelling quest:", updateError);
      if (updateError.code === "PGRST116") {
        // Row not found matching update criteria (likely status changed)
        return next(
          new ConflictError(
            "Failed to cancel quest, status may have changed or quest not found."
          )
        );
      }
      // Handle other potential constraint violations if necessary
      // if (updateError.message.includes("constraint violation")) { ... }
      return next(new InternalServerError("Failed to cancel quest."));
    }

    // If updateError is null, .single() guarantees data is not null
    // The check below is redundant if PGRST116 is handled above.
    // if (!updatedQuest) { ... }

    res.status(200).json(updatedQuest);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in cancelQuest handler:", error);
    next(error); // Pass to global error handler
  }
}
