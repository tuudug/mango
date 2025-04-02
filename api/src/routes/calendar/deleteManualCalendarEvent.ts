import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

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
      res.status(401).json({ message: "Authentication data missing" });
      return;
    }
    const { eventId } = req.params;
    if (!eventId) {
      res.status(400).json({ message: "Missing event ID" });
      return;
    }

    // Use REQUEST-SCOPED client to delete (RLS applies)
    const { error } = await supabaseUserClient // USE REQUEST-SCOPED CLIENT
      .from("manual_calendar_events")
      .delete()
      .eq("id", eventId)
      .eq("user_id", userId); // RLS also checks this

    if (error) throw error;

    console.log(`Manual event ${eventId} deleted for user ${userId}`);
    res.status(200).json({ message: "Event deleted successfully" });
  } catch (err: unknown) {
    console.error("Server error deleting manual event:", err);
    next(err);
  }
};
