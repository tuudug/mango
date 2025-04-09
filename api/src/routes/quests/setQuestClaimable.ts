import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

// WARNING: This is a testing-only endpoint and should be disabled or secured in production.
export async function setQuestClaimable(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { questId } = req.params;

  // Basic security check - could be enhanced (e.g., check NODE_ENV)
  if (process.env.NODE_ENV === "production") {
    res
      .status(403)
      .json({ message: "This testing endpoint is disabled in production." });
    return;
  }

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!questId) {
    res.status(400).json({ message: "Quest ID is required." });
    return;
  }

  try {
    // Update the quest status directly to 'claimable'
    const { data: updatedQuest, error: updateError } = await supabase
      .from("quests")
      .update({ status: "claimable", claimable_at: new Date().toISOString() })
      .eq("id", questId)
      .eq("user_id", userId) // Ensure ownership
      // Allow updating from any status for testing flexibility, but could restrict further
      .select(`*, quest_criteria (*)`) // Return updated quest
      .single();

    if (updateError) {
      console.error("Error setting quest claimable (testing):", updateError);
      if (updateError.code === "PGRST116") {
        // Handle case where quest doesn't exist
        res.status(404).json({ message: "Quest not found." });
        return;
      }
      return next(new Error("Failed to set quest claimable (testing)."));
    }

    if (!updatedQuest) {
      // Should be covered by PGRST116 check, but as a fallback
      res.status(404).json({ message: "Quest not found or update failed." });
      return;
    }

    res
      .status(200)
      .json({
        message: "Quest status set to claimable (testing only).",
        quest: updatedQuest,
      });
  } catch (error) {
    console.error("Unexpected error setting quest claimable (testing):", error);
    next(error);
  }
}
