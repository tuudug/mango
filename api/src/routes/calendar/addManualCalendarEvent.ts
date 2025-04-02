import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // Keep admin client
import { AuthenticatedRequest } from "../../middleware/auth";

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
      res.status(401).json({ message: "Authentication data missing" });
      return;
    }
    const { title, date } = req.body;
    if (!title || !date) {
      res.status(400).json({ message: "Missing title or date" });
      return;
    }

    // Find or create the 'manual_calendar' connection using ADMIN client
    const connectionData = await supabaseAdmin
      .from("data_source_connections")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", "manual_calendar")
      .maybeSingle();

    const connFindError = connectionData.error;
    let connection = connectionData.data;

    if (connFindError) throw connFindError;
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
      if (connInsertError) throw connInsertError;
      connection = newConnection;
    }

    if (!connection?.id)
      throw new Error("Manual connection ID not found/created");

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

    if (insertError) throw insertError;

    console.log(`Manual event added for user ${userId}:`, newEvent);
    res.status(201).json(newEvent);
  } catch (err: unknown) {
    console.error("Server error adding manual event:", err);
    next(err);
  }
};
