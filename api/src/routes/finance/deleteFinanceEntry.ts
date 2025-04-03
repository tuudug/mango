import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const deleteFinanceEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const entryId = req.params.id; // Get entry ID from route parameter

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  if (!entryId) {
    res.status(400).json({ message: "Entry ID is required." });
    return;
  }

  try {
    const { error } = await supabase
      .from("manual_finance_entries")
      .delete()
      .eq("user_id", userId) // Ensure user owns the entry
      .eq("id", entryId); // Match the specific entry ID

    if (error) {
      console.error("Error deleting finance entry:", error);
      // Handle specific errors like not found if needed, though delete is often idempotent
      throw error;
    }

    console.log(`Deleted finance entry ${entryId} for user ${userId}`);
    res.status(204).send(); // 204 No Content on successful deletion
  } catch (error) {
    console.error("Error in deleteFinanceEntry handler:", error);
    next(error); // Pass error to the global error handler
  }
};
