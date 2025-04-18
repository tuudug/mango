import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
// Removed awardXpToUser import
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

    // 1. Fetch the quest to verify ownership, status, and get Spark reward
    // TODO: Ensure 'spark_reward' column exists in 'quests' table
    const { data: targetQuest, error: fetchError } = await supabase
      .from("quests")
      .select("id, user_id, status, spark_reward") // Fetch spark_reward instead of xp_reward
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

    // 3. Award Sparks (run after successful quest update)
    // TODO: Ensure 'spark_balance' column exists in 'user_settings' table
    const sparksAwarded = targetQuest.spark_reward ?? 0; // Use nullish coalescing for safety
    if (sparksAwarded > 0) {
      try {
        // Fetch current spark balance
        const { data: settings, error: settingsError } = await supabase
          .from("user_settings")
          .select("spark_balance")
          .eq("user_id", userId)
          .single();

        if (settingsError) {
          console.error(
            `[Spark Award Error] Failed to fetch settings for user ${userId} for quest ${questId}:`,
            settingsError
          );
          // Log and continue, don't fail the claim
        } else {
          const currentBalance = settings?.spark_balance ?? 0;
          const newBalance = currentBalance + sparksAwarded;

          // Update spark balance
          const { error: updateBalanceError } = await supabase
            .from("user_settings")
            .update({ spark_balance: newBalance })
            .eq("user_id", userId);

          if (updateBalanceError) {
            console.error(
              `[Spark Award Error] Failed to update spark balance for user ${userId} for quest ${questId}:`,
              updateBalanceError
            );
            // Log and continue
          } else {
            console.log(
              `Awarded ${sparksAwarded} Sparks to user ${userId} for quest ${questId}. New balance: ${newBalance}`
            );
          }
        }
      } catch (sparkError) {
        console.error(
          `[Spark Award Exception] Unexpected error awarding Sparks for quest ${questId} to user ${userId}:`,
          sparkError
        );
        // Log and continue
      }
    } else {
      console.log(
        `Quest ${questId} claimed by user ${userId}, but had 0 Spark reward.`
      );
    }

    // Return the successfully completed quest data (which now includes criteria)
    res.status(200).json(updatedQuest);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in claimQuest handler:", error);
    next(error); // Pass to global error handler
  }
}
