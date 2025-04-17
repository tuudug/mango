import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

export const deleteFinanceEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client
  const entryId = req.params.id; // Get entry ID from route parameter

  if (!userId || !supabase) {
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  if (!entryId) {
    return next(new BadRequestError("Missing required parameter: entryId"));
  }

  try {
    const { error } = await supabase
      .from("manual_finance_entries")
      .delete()
      .eq("user_id", userId) // Ensure user owns the entry
      .eq("id", entryId); // Match the specific entry ID

    if (error) {
      // Check for specific PostgREST error code for not found / RLS violation
      if (error.code === "PGRST116") {
        console.warn(
          `Finance entry ${entryId} not found or delete forbidden for user ${userId}.`
        );
        return next(
          new NotFoundError("Finance entry not found or delete forbidden")
        );
      }
      // For other DB errors, throw InternalServerError
      console.error(
        `Supabase error deleting finance entry ${entryId} for user ${userId}:`,
        error
      );
      return next(new InternalServerError("Failed to delete finance entry"));
    }

    console.log(`Deleted finance entry ${entryId} for user ${userId}`);
    res.status(204).send(); // 204 No Content on successful deletion
  } catch (error) {
    console.error("Error in deleteFinanceEntry handler:", error);
    next(error); // Pass error to the global error handler
  }
};
