import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

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
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    if (!entryId) {
      return next(new BadRequestError("Missing required parameter: entryId"));
    }

    // Use REQUEST-SCOPED client to delete (RLS applies)
    const { error } = await supabaseUserClient
      .from("manual_health_entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", userId); // RLS also checks this implicitly

    if (error) {
      // Check for specific PostgREST error code for not found / RLS violation
      // PGRST116 is more reliable than PGRST204 for RLS/filter failures on delete
      if (error.code === "PGRST116") {
        console.warn(
          `Health entry ${entryId} not found or delete forbidden for user ${userId}.`
        );
        return next(
          new NotFoundError("Health entry not found or delete forbidden")
        );
      }
      // For other DB errors, throw InternalServerError
      console.error(
        `Supabase error deleting health entry ${entryId} for user ${userId}:`,
        error
      );
      return next(new InternalServerError("Failed to delete health entry"));
    }

    console.log(`Manual health entry ${entryId} deleted for user ${userId}`);
    res.status(200).json({ message: "Health entry deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual health entry:", err);
    next(err); // Pass error to global handler
  }
};
