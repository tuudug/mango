import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // Need admin client
import { AuthenticatedRequest } from "../../middleware/auth";

export const addManualHealthEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase; // Get request-scoped client

    if (!userId || !supabaseUserClient) {
      res.status(401).json({ message: "Authentication data missing" });
      return;
    }
    // Validate request body
    const { entry_date, type, value } = req.body;
    if (!entry_date || !type || value === undefined || value === null) {
      res.status(400).json({
        message: "Missing required fields: entry_date, type, value",
      });
      return;
    }
    // Basic type validation (can be expanded)
    if (typeof type !== "string" || typeof value !== "number") {
      res.status(400).json({ message: "Invalid data type for type or value" });
      return;
    }

    // Find or create the 'manual_health' connection using ADMIN client
    const { data: connection, error: connError } = await supabaseAdmin
      .from("data_source_connections")
      .upsert(
        {
          user_id: userId,
          provider: "manual_health",
          account_identifier: "Manual Health Entries",
        },
        { onConflict: "user_id, provider", ignoreDuplicates: false }
      )
      .select("id")
      .single();

    if (connError || !connection?.id) {
      console.error(
        "Error finding/creating manual_health connection:",
        connError
      );
      throw (
        connError || new Error("Manual health connection ID not found/created")
      );
    }

    // Insert the manual health entry using the REQUEST-SCOPED client
    const { data: newEntry, error: insertError } = await supabaseUserClient
      .from("manual_health_entries")
      .insert({
        user_id: userId,
        connection_id: connection.id,
        entry_date,
        type,
        value,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    console.log(`Manual health entry added for user ${userId}:`, newEntry);
    res.status(201).json(newEntry);
  } catch (err: unknown) {
    console.error("Server error adding manual health entry:", err);
    next(err); // Pass error to global handler
  }
};
