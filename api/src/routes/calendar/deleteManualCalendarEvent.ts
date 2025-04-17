import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  BadRequestError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

export const deleteManualCalendarEvent = async (
  req: AuthenticatedRequest, // Use exported interface
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use properties from the interface
    const userId = req.userId;
    const supabaseUserClient = req.supabase;

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    const { eventId } = req.params;
    if (!eventId) {
      return next(new BadRequestError("Missing required parameter: eventId"));
    }

    // Use REQUEST-SCOPED client to delete (RLS applies)
    const { error } = await supabaseUserClient // USE REQUEST-SCOPED CLIENT
      .from("manual_calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId); // RLS also checks this

    if (error) {
      // Check for specific PostgREST error code for not found / RLS violation
      if (error.code === "PGRST116") {
        console.warn(
          `Manual event ${eventId} not found or delete forbidden for user ${userId}.`
        );
        return next(new NotFoundError("Event not found or delete forbidden"));
      }
      // For other DB errors, throw InternalServerError
      console.error(
        `Supabase error deleting manual event ${eventId} for user ${userId}:`,
        error
      );
      return next(
        new InternalServerError("Failed to delete manual calendar event")
      );
    }

    console.log(`Manual event ${eventId} deleted for user ${userId}`);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual event:", err);
    next(err);
  }
};
