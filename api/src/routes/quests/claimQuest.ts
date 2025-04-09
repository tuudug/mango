import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { awardXpToUser } from "../../services/userProgressService"; // Import the XP service
import { Database } from "../../types/supabase"; // Import Database type

export async function claimQuest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  // Explicitly type supabase client
  const supabase = req.supabase as AuthenticatedRequest["supabase"];
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
    // 1. Fetch the quest to verify ownership, status, and get XP reward
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
      res.status(400).json({
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
      .select(`*, quest_criteria (*)`) // Return updated quest with criteria
      .single();

    if (updateError) {
      console.error("Error completing quest:", updateError);
      // Check if the error is due to the row not being found (status changed between fetch and update)
      if (updateError.code === "PGRST116") {
        res.status(409).json({
          message: "Failed to claim quest, status may have changed.",
        });
        return;
      }
      return next(new Error("Failed to claim quest."));
    }

    // If updatedQuest is null here, it means the update affected 0 rows (likely status changed)
    if (!updatedQuest) {
      res.status(409).json({
        message:
          "Failed to claim quest, status may have changed or quest not found.",
      });
      return;
    }

    // 3. Award XP using the service function
    const xpAwarded = targetQuest.xp_reward;
    if (xpAwarded > 0) {
      const xpResult = await awardXpToUser(userId, xpAwarded, supabase);
      if (!xpResult.success) {
        // Log the error but proceed with returning the completed quest data
        console.error(
          `Failed to award ${xpAwarded} XP to user ${userId} for quest ${questId}: ${xpResult.error}`
        );
        // Optionally, you could add a flag to the response indicating XP award failure
      } else {
        console.log(
          `Awarded ${xpAwarded} XP to user ${userId} for quest ${questId}. New level: ${xpResult.newLevel}`
        );
      }
    } else {
      console.log(
        `Quest ${questId} claimed by user ${userId}, but had 0 XP reward.`
      );
    }

    // Return the successfully completed quest data
    res.status(200).json(updatedQuest);
  } catch (error) {
    console.error("Unexpected error claiming quest:", error);
    next(error);
  }
}
