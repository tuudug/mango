import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const deleteManualHealthEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase; // Get request-scoped client
    const { entryId } = req.params;

    if (!userId || !supabaseUserClient) {
      res.status(401).json({ message: "Authentication data missing" });
      return;
    }
    if (!entryId) {
      res.status(400).json({ message: "Missing entry ID" });
      return;
    }

    // Use REQUEST-SCOPED client to delete (RLS applies)
    const { error } = await supabaseUserClient
      .from("manual_health_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId); // RLS also checks this implicitly

    if (error) {
      // Check if the error is because the row wasn't found (e.g., wrong ID or not owned by user)
      if (error.code === "PGRST204") {
        // PostgREST code for no rows found
        res
          .status(404)
          .json({ message: "Health entry not found or not owned by user" });
        return;
      }
      // Otherwise, throw the actual error
      throw error;
    }

    console.log(`Manual health entry ${entryId} deleted for user ${userId}`);
    res.status(200).json({ message: "Health entry deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual health entry:", err);
    next(err); // Pass error to global handler
  }
};
