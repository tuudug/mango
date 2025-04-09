import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export async function cancelQuest(
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
    // Fetch the quest to verify ownership and status
    const { data: targetQuest, error: fetchError } = await supabase
      .from("quests")
      .select("id, user_id, status")
      .eq("id", questId)
      .single();

    if (fetchError) {
      console.error("Error fetching quest for cancellation:", fetchError);
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

    // Only allow cancelling 'active' quests in this flow
    if (targetQuest.status !== "active") {
      res
        .status(400)
        .json({
          message: `Quest cannot be cancelled (current status: ${targetQuest.status}). Only active quests can be cancelled.`,
        });
      return;
    }

    // Update the quest status to 'cancelled'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId) // Ensure ownership
      .eq("status", "active") // Ensure status hasn't changed
      .select(`*, quest_criteria (*)`) // Return updated quest
      .single();

    if (updateError) {
      console.error("Error cancelling quest:", updateError);
      if (updateError.message.includes("constraint violation")) {
        res
          .status(409)
          .json({
            message: "Failed to cancel quest, status may have changed.",
          });
        return;
      }
      return next(new Error("Failed to cancel quest."));
    }

    if (!updatedQuest) {
      res
        .status(409)
        .json({
          message:
            "Failed to cancel quest, status may have changed or quest not found.",
        });
      return;
    }

    res.status(200).json(updatedQuest);
  } catch (error) {
    console.error("Unexpected error cancelling quest:", error);
    next(error);
  }
}
