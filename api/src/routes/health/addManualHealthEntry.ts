import { Response, NextFunction } from "express";
import { supabaseAdmin } from "../../supabaseClient"; // Need admin client
import { AuthenticatedRequest } from "../../middleware/auth";
import { InternalServerError, ValidationError } from "../../utils/errors"; // Import custom errors

export const addManualHealthEntry = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.userId;
    const supabaseUserClient = req.supabase; // Get request-scoped client

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    // Validate request body
    const { entry_date, type, value } = req.body;
    if (!entry_date || !type || value === undefined || value === null) {
      return next(
        new ValidationError("Missing required fields: entry_date, type, value")
      );
    }
    // Basic type validation (can be expanded)
    if (typeof type !== "string" || typeof value !== "number") {
      return next(new ValidationError("Invalid data type for type or value"));
    }
    // Add more specific date/type/value validation if needed

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

    if (connError) {
      console.error(
        `Supabase error finding/creating manual_health connection for user ${userId}:`,
        connError
      );
      return next(
        new InternalServerError(
          "Failed to establish connection for manual health entries"
        )
      );
    }
    if (!connection?.id) {
      console.error(
        `Manual health connection ID missing after find/create for user ${userId}`
      );
      return next(
        new InternalServerError("Failed to obtain manual health connection ID")
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

    if (insertError) {
      console.error(
        `Supabase error inserting manual health entry for user ${userId}:`,
        insertError
      );
      return next(new InternalServerError("Failed to add manual health entry"));
    }

    console.log(`Manual health entry added for user ${userId}:`, newEntry);
    res.status(201).json(newEntry);
  } catch (err: unknown) {
    console.error("Server error adding manual health entry:", err);
    next(err); // Pass error to global handler
  }
};
