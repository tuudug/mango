import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

const MAX_ACTIVE_DAILY_QUESTS = 2;
const MAX_ACTIVE_WEEKLY_QUESTS = 4;

export async function activateQuest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { questId } = req.params;

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!questId) {
    res.status(400).json({ message: "Quest ID is required." });
    return;
  }

  try {
    // 1. Fetch the quest to be activated
    const { data: targetQuest, error: fetchTargetError } = await supabase
      .from("quests")
      .select("id, user_id, status, type")
      .eq("id", questId)
      .single();

    if (fetchTargetError) {
      console.error("Error fetching target quest:", fetchTargetError);
      if (fetchTargetError.code === "PGRST116") {
        res.status(404).json({ message: "Quest not found." });
        return;
      }
      return next(new Error("Failed to fetch quest details."));
    }

    if (targetQuest.user_id !== userId) {
      res.status(403).json({ message: "You do not own this quest." });
      return;
    }

    if (targetQuest.status !== "available") {
      res
        .status(400)
        .json({
          message: `Quest is not available for activation (current status: ${targetQuest.status}).`,
        });
      return;
    }

    // 2. Fetch currently active quests for the user
    const { data: activeQuests, error: fetchActiveError } = await supabase
      .from("quests")
      .select("id, type")
      .eq("user_id", userId)
      .eq("status", "active");

    if (fetchActiveError) {
      console.error("Error fetching active quests:", fetchActiveError);
      return next(new Error("Failed to check active quest limits."));
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
      res
        .status(400)
        .json({
          message: `Cannot activate quest. Maximum active daily quests (${MAX_ACTIVE_DAILY_QUESTS}) reached.`,
        });
      return;
    }

    if (
      targetQuest.type === "weekly" &&
      activeWeeklyCount >= MAX_ACTIVE_WEEKLY_QUESTS
    ) {
      res
        .status(400)
        .json({
          message: `Cannot activate quest. Maximum active weekly quests (${MAX_ACTIVE_WEEKLY_QUESTS}) reached.`,
        });
      return;
    }

    // 4. Activate the quest
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "active", activated_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId) // Ensure ownership again
      .eq("status", "available") // Ensure status hasn't changed concurrently
      .select(`*, quest_criteria (*)`) // Return updated quest with criteria
      .single();

    if (updateError) {
      console.error("Error activating quest:", updateError);
      // Handle potential race condition where status changed
      if (updateError.message.includes("constraint violation")) {
        res
          .status(409)
          .json({
            message: "Failed to activate quest, status may have changed.",
          });
        return;
      }
      return next(new Error("Failed to activate quest."));
    }

    if (!updatedQuest) {
      // This might happen if the status changed between the check and the update
      res
        .status(409)
        .json({
          message:
            "Failed to activate quest, status may have changed or quest not found.",
        });
      return;
    }

    res.status(200).json(updatedQuest);
  } catch (error) {
    console.error("Unexpected error activating quest:", error);
    next(error);
  }
}
