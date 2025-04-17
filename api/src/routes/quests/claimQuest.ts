import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { awardXpToUser } from "../../services/userProgressService";
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from "../../utils/errors";
// Database type import is not strictly needed here if not used directly

export async function claimQuest(
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

    // 1. Fetch the quest to verify ownership, status, and get XP reward
    const { data: targetQuest, error: fetchError } = await supabase
      .from("quests")
      .select("id, user_id, status, xp_reward")
      .eq("id", questId)
      .single();

    if (fetchError) {
      console.error("Supabase error fetching quest for claiming:", fetchError);
      if (fetchError.code === "PGRST116") {
        return next(new NotFoundError("Quest not found."));
      }
      return next(new InternalServerError("Failed to fetch quest details."));
    }

    if (targetQuest.user_id !== userId) {
      return next(new AuthorizationError("You do not own this quest."));
    }

    if (targetQuest.status !== "claimable") {
      return next(
        new BadRequestError(
          `Quest is not claimable (current status: ${targetQuest.status}).`
        )
      );
    }

    // 2. Update the quest status to 'completed'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId)
      .eq("status", "claimable") // Concurrency check
      .select(`*, quest_criteria (*)`)
      .single();

    if (updateError) {
      console.error("Supabase error completing quest:", updateError);
      if (updateError.code === "PGRST116") {
        // Row not found matching update criteria (likely status changed)
        return next(
          new ConflictError(
            "Failed to claim quest, status may have changed or quest not found."
          )
        );
      }
      return next(new InternalServerError("Failed to claim quest."));
    }

    // If updateError is null, .single() guarantees data is not null
    // The check below is redundant if PGRST116 is handled above.
    // if (!updatedQuest) { ... }

    // 3. Award XP (run after successful quest update, before sending response)
    const xpAwarded = targetQuest.xp_reward;
    if (xpAwarded > 0) {
      try {
        const xpResult = await awardXpToUser(userId, xpAwarded, supabase);
        if (!xpResult.success) {
          // Log the error but don't fail the entire request
          console.error(
            `[XP Award Error] Failed to award ${xpAwarded} XP to user ${userId} for quest ${questId}: ${xpResult.error}`
          );
          // Optionally add info to response or handle differently
        } else {
          console.log(
            `Awarded ${xpAwarded} XP to user ${userId} for quest ${questId}. New level: ${xpResult.newLevel}`
          );
        }
      } catch (xpError) {
        console.error(
          `[XP Award Exception] Unexpected error awarding XP for quest ${questId} to user ${userId}:`,
          xpError
        );
        // Decide if this should block the response. For now, log and continue.
      }
    } else {
      console.log(
        `Quest ${questId} claimed by user ${userId}, but had 0 XP reward.`
      );
    }

    // Return the successfully completed quest data
    res.status(200).json(updatedQuest);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in claimQuest handler:", error);
    next(error); // Pass to global error handler
  }
}
