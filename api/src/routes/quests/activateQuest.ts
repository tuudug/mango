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

const MAX_ACTIVE_DAILY_QUESTS = 2;
const MAX_ACTIVE_WEEKLY_QUESTS = 4;

export async function activateQuest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const { questId } = req.params;

  try {
    const userId = req.user?.id; // Use req.user from passport middleware
    const supabase = req.supabase;

    if (!userId || !supabase) {
      // Should be caught by auth middleware, but check defensively
      return next(new AuthenticationError("Authentication required."));
    }

    if (!questId) {
      return next(new BadRequestError("Quest ID is required."));
    }

    // 1. Fetch the quest to be activated
    const { data: targetQuest, error: fetchTargetError } = await supabase
      .from("quests")
      .select("id, user_id, status, type")
      .eq("id", questId)
      .single();

    if (fetchTargetError) {
      console.error("Supabase error fetching target quest:", fetchTargetError);
      if (fetchTargetError.code === "PGRST116") {
        // Row not found
        return next(new NotFoundError("Quest not found."));
      }
      return next(new InternalServerError("Failed to fetch quest details."));
    }

    if (targetQuest.user_id !== userId) {
      return next(new AuthorizationError("You do not own this quest."));
    }

    if (targetQuest.status !== "available") {
      return next(
        new BadRequestError(
          `Quest is not available for activation (current status: ${targetQuest.status}).`
        )
      );
    }

    // 2. Fetch currently active quests for the user
    const { data: activeQuests, error: fetchActiveError } = await supabase
      .from("quests")
      .select("id, type")
      .eq("user_id", userId)
      .eq("status", "active");

    if (fetchActiveError) {
      console.error("Supabase error fetching active quests:", fetchActiveError);
      return next(
        new InternalServerError("Failed to check active quest limits.")
      );
    }

    // 3. Check limits
    const activeDailyCount =
      activeQuests?.filter((q) => q.type === "daily").length ?? 0;
    const activeWeeklyCount =
      activeQuests?.filter((q) => q.type === "weekly").length ?? 0;

    if (
      targetQuest.type === "daily" &&
      activeDailyCount >= MAX_ACTIVE_DAILY_QUESTS
    ) {
      return next(
        new BadRequestError(
          `Cannot activate quest. Maximum active daily quests (${MAX_ACTIVE_DAILY_QUESTS}) reached.`
        )
      );
    }

    if (
      targetQuest.type === "weekly" &&
      activeWeeklyCount >= MAX_ACTIVE_WEEKLY_QUESTS
    ) {
      return next(
        new BadRequestError(
          `Cannot activate quest. Maximum active weekly quests (${MAX_ACTIVE_WEEKLY_QUESTS}) reached.`
        )
      );
    }

    // 4. Activate the quest
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId)
      .eq("status", "available") // Concurrency check
      .select(`*, quest_criteria (*)`)
      .single();

    if (updateError) {
      console.error("Supabase error activating quest:", updateError);
      // Check if it was a concurrency issue (row not found matching the update criteria)
      if (updateError.code === "PGRST116") {
        return next(
          new ConflictError(
            "Failed to activate quest, status may have changed or quest not found."
          )
        );
      }
      // Handle other potential constraint violations if necessary
      // if (updateError.message.includes("constraint violation")) { ... }
      return next(new InternalServerError("Failed to activate quest."));
    }

    // If updateError is null, .single() guarantees data is not null
    // The check below is redundant if PGRST116 is handled above.
    // if (!updatedQuest) { ... }

    res.status(200).json(updatedQuest);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in activateQuest handler:", error);
    next(error); // Pass to global error handler
  }
}
