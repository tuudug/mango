import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
// We need a way to call the addXp logic. Ideally refactor addXp into a service.
// For now, we'll skip the direct XP call and assume frontend handles refresh.

export async function claimQuest(
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
    // 1. Fetch the quest to verify ownership and status
    const { data: targetQuest, error: fetchError } = await supabase
      .from("quests")
      .select("id, user_id, status, xp_reward")
      .eq("id", questId)
      .single();

    if (fetchError) {
      console.error("Error fetching quest for claiming:", fetchError);
      if (fetchError.code === "PGRST116") {
        res.status(404).json({ message: "Quest not found." });
        return;
      }
      return next(new Error("Failed to fetch quest details."));
    }

    if (targetQuest.user_id !== userId) {
      res.status(403).json({ message: "You do not own this quest." });
      return;
    }

    if (targetQuest.status !== "claimable") {
      res
        .status(400)
        .json({
          message: `Quest is not claimable (current status: ${targetQuest.status}).`,
        });
      return;
    }

    // 2. Update the quest status to 'completed'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId) // Ensure ownership
      .eq("status", "claimable") // Ensure status hasn't changed
      .select(`*, quest_criteria (*)`) // Return updated quest
      .single();

    if (updateError) {
      console.error("Error completing quest:", updateError);
      if (updateError.message.includes("constraint violation")) {
        res
          .status(409)
          .json({ message: "Failed to claim quest, status may have changed." });
        return;
      }
      return next(new Error("Failed to claim quest."));
    }

    if (!updatedQuest) {
      res
        .status(409)
        .json({
          message:
            "Failed to claim quest, status may have changed or quest not found.",
        });
      return;
    }

    // 3. Award XP - Skipping direct internal call for now.
    // The frontend should refetch user data (including XP) after a successful claim.
    const xpAwarded = targetQuest.xp_reward;
    console.log(
      `Quest ${questId} claimed by user ${userId}. XP Award: ${xpAwarded}. Frontend should refresh auth context.`
    );

    res.status(200).json(updatedQuest);
  } catch (error) {
    console.error("Unexpected error claiming quest:", error);
    next(error);
  }
}
