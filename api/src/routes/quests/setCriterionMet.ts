import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

// WARNING: This is a testing-only endpoint and should be disabled or secured in production.
export async function setCriterionMet(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { criterionId } = req.params;

  // Basic security check
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

  if (!criterionId) {
    res.status(400).json({ message: "Criterion ID is required." });
    return;
  }

  try {
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
        "Error checking criterion ownership (testing):",
        checkError
      );
      if (checkError.code === "PGRST116") {
        res.status(404).json({ message: "Criterion not found." });
        return;
      }
      return next(new Error("Failed to check criterion ownership (testing)."));
    }

    // The result structure might be nested like { id: '...', quest: { user_id: '...' } }
    // Adjust the check based on the actual structure returned by Supabase
    const ownerId = (criterionCheck as any)?.quest?.user_id;
    if (!ownerId || ownerId !== userId) {
      res
        .status(403)
        .json({
          message: "You do not own the quest associated with this criterion.",
        });
      return;
    }

    // 2. Update the criterion status directly to 'is_met = true'
    const { data: updatedCriterion, error: updateError } = await supabase
      .from("quest_criteria")
      .update({ is_met: true }) // Set is_met to true
      .eq("id", criterionId)
      // No need for user_id check here as ownership was verified above
      .select() // Return updated criterion
      .single();

    if (updateError) {
      console.error("Error setting criterion met (testing):", updateError);
      if (updateError.code === "PGRST116") {
        // Should not happen if check passed, but good practice
        res.status(404).json({ message: "Criterion not found during update." });
        return;
      }
      return next(new Error("Failed to set criterion met (testing)."));
    }

    if (!updatedCriterion) {
      res
        .status(404)
        .json({ message: "Criterion not found or update failed." });
      return;
    }

    res
      .status(200)
      .json({
        message: "Criterion status set to met (testing only).",
        criterion: updatedCriterion,
      });
  } catch (error) {
    console.error("Unexpected error setting criterion met (testing):", error);
    next(error);
  }
}
