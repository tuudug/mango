import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // Keep admin client
import { AuthenticatedRequest } from "../../middleware/auth";
import { InternalServerError, ValidationError } from "../../utils/errors"; // Import custom errors

export const addManualCalendarEvent = async (
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
    const { title, date } = req.body;
    if (!title || !date) {
      // Use ValidationError for missing body fields
      return next(
        new ValidationError("Missing required fields: title or date")
      );
    }
    // Add more specific date validation if needed (e.g., using dayjs)

    // Find or create the 'manual_calendar' connection using ADMIN client
    const connectionData = await supabaseAdmin
      .from("data_source_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "manual_calendar")
      .maybeSingle();

    const connFindError = connectionData.error;
    let connection = connectionData.data;

    if (connFindError) {
      console.error(
        `Supabase error finding manual calendar connection for user ${userId}:`,
        connFindError
      );
      return next(
        new InternalServerError(
          "Failed to check for manual calendar connection"
        )
      );
    }
    if (!connection) {
      const { data: newConnection, error: connInsertError } =
        await supabaseAdmin
          .from("data_source_connections")
          .insert({
            user_id: userId,
            provider: "manual_calendar",
            account_identifier: "Manual Entries",
          })
          .select("id")
          .single();
      if (connInsertError) {
        console.error(
          `Supabase error creating manual calendar connection for user ${userId}:`,
          connInsertError
        );
        return next(
          new InternalServerError("Failed to create manual calendar connection")
        );
      }
      connection = newConnection;
    }

    if (!connection?.id) {
      // This should ideally not happen if the above logic is correct
      console.error(
        `Manual connection ID missing after find/create for user ${userId}`
      );
      return next(
        new InternalServerError("Failed to obtain manual connection ID")
      );
    }

    // Insert the manual event using the REQUEST-SCOPED client (RLS applies)
    const { data: newEvent, error: insertError } = await supabaseUserClient // USE REQUEST-SCOPED CLIENT
      .from("manual_calendar_events")
      .insert({
        user_id: userId,
        connection_id: connection.id,
        title,
        event_date: date,
        is_all_day: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error(
        `Supabase error inserting manual calendar event for user ${userId}:`,
        insertError
      );
      return next(
        new InternalServerError("Failed to add manual calendar event")
      );
    }

    console.log(`Manual event added for user ${userId}:`, newEvent);
    res.status(201).json(newEvent);
  } catch (err: unknown) {
    console.error("Server error adding manual event:", err);
    next(err);
  }
};
