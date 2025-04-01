import express, { Response, Router, NextFunction } from "express";
import { google, fitness_v1 } from "googleapis"; // Import fitness API types
import { GaxiosResponse } from "gaxios"; // Import GaxiosResponse type
import { supabaseAdmin } from "../supabaseClient"; // Need admin client
// Import shared middleware and the exported interface
import { ensureAuthenticated, AuthenticatedRequest } from "../middleware/auth";
import { decrypt } from "../utils/crypto"; // Need decrypt
import { addDays, startOfDay, endOfDay, format } from "date-fns"; // Date helpers + format

const router: Router = express.Router();

// --- Types ---
// Define a type for the health entries returned by this API
interface HealthEntry {
  id: string;
  connection_id: string;
  entry_date: string;
  type: string;
  value: number;
  created_at: string;
  updated_at: string;
  sourceProvider: "manual" | "google_health"; // Make non-optional for merged data
}

// Type for Google Health credentials stored in DB (matches calendar for now)
interface StoredGoogleCredentials {
  access_token: string; // Encrypted
  refresh_token?: string | null; // Encrypted
  scope?: string;
  google_profile_id?: string;
}

// Type for credentials used by googleapis client (decrypted)
interface DecryptedGoogleCredentials {
  access_token: string;
  refresh_token?: string | null;
  scope?: string;
}

// --- Routes ---

// GET /api/health - Fetch merged health entries for the user
router.get(
  "/",
  ensureAuthenticated,
  async (
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

      let rawHealthEntries: HealthEntry[] = []; // Store raw entries before aggregation
      let isGoogleHealthConnected = false; // Track connection status

      // 0. Check Google Health Connection Status
      try {
        const { count, error: googleConnError } = await supabaseAdmin
          .from("data_source_connections")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("provider", "google_health");

        if (googleConnError) {
          console.error(
            "Error checking Google Health connection:",
            googleConnError
          );
        } else if (count !== null && count > 0) {
          isGoogleHealthConnected = true;
          console.log(`Google Health connection found for user ${userId}`);
        }
      } catch (err) {
        console.error(
          "Unexpected error checking Google Health connection:",
          err
        );
      }

      // 1. Fetch Manual Health Entries
      try {
        const { data: manualEntries, error: manualError } =
          await supabaseUserClient
            .from("manual_health_entries")
            .select(
              "id, connection_id, entry_date, type, value, created_at, updated_at"
            )
            .eq("user_id", userId);

        if (manualError) throw manualError;

        if (manualEntries) {
          const manualItems: HealthEntry[] = manualEntries.map((entry) => ({
            ...entry,
            sourceProvider: "manual",
          }));
          rawHealthEntries = rawHealthEntries.concat(manualItems);
          console.log(
            `Fetched ${manualItems.length} manual health entries for user ${userId}`
          );
        }
      } catch (err) {
        console.error("Error processing manual health entries:", err);
      }

      // 2. Fetch Google Health Steps (if connected)
      if (isGoogleHealthConnected) {
        try {
          const { data: connections, error: connError } = await supabaseAdmin
            .from("data_source_connections")
            .select("id, credentials")
            .eq("user_id", userId)
            .eq("provider", "google_health");

          if (connError) throw connError;

          for (const connection of connections) {
            const storedCredentials =
              connection.credentials as StoredGoogleCredentials;
            let decryptedCreds: DecryptedGoogleCredentials | null = null;

            try {
              if (!storedCredentials?.access_token) continue;
              decryptedCreds = {
                access_token: decrypt(storedCredentials.access_token),
                refresh_token: storedCredentials.refresh_token
                  ? decrypt(storedCredentials.refresh_token)
                  : null,
                scope: storedCredentials.scope,
              };
            } catch (decryptionError) {
              console.error(
                `Failed to decrypt Google Health credentials for conn ${connection.id}:`,
                decryptionError
              );
              continue;
            }

            if (decryptedCreds?.access_token) {
              try {
                const oauth2Client = new google.auth.OAuth2(
                  process.env.GOOGLE_CLIENT_ID,
                  process.env.GOOGLE_CLIENT_SECRET
                );
                oauth2Client.setCredentials({
                  access_token: decryptedCreds.access_token,
                  refresh_token: decryptedCreds.refresh_token ?? undefined,
                  scope: decryptedCreds.scope,
                });

                // TODO: Add token refresh handler

                const fitness = google.fitness({
                  version: "v1",
                  auth: oauth2Client,
                });
                const endTime = endOfDay(new Date());
                const startTime = startOfDay(addDays(endTime, -6));

                const requestBody: fitness_v1.Params$Resource$Users$Dataset$Aggregate["requestBody"] =
                  {
                    aggregateBy: [
                      {
                        dataTypeName: "com.google.step_count.delta",
                        dataSourceId:
                          "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
                      },
                    ],
                    bucketByTime: { durationMillis: "86400000" }, // Needs to be string
                    startTimeMillis: String(startTime.getTime()),
                    endTimeMillis: String(endTime.getTime()),
                  };

                const response: GaxiosResponse<fitness_v1.Schema$AggregateResponse> =
                  await fitness.users.dataset.aggregate({
                    userId: "me",
                    requestBody: requestBody,
                  });

                const buckets = response.data?.bucket;
                if (buckets && buckets.length > 0) {
                  const googleStepsEntries: HealthEntry[] = buckets.flatMap(
                    (bucket: fitness_v1.Schema$AggregateBucket) => {
                      const startTimeMs = parseInt(
                        bucket.startTimeMillis ?? "0"
                      );
                      const entryDate = format(
                        new Date(startTimeMs),
                        "yyyy-MM-dd"
                      );
                      const stepsData = bucket.dataset?.[0]?.point?.[0];
                      const stepsValue = stepsData?.value?.[0]?.intVal;

                      if (stepsValue !== undefined && stepsValue !== null) {
                        return [
                          {
                            id: `google-steps-${entryDate}`,
                            connection_id: connection.id,
                            entry_date: entryDate,
                            type: "steps",
                            value: stepsValue,
                            sourceProvider: "google_health",
                            created_at: new Date(startTimeMs).toISOString(),
                            updated_at: new Date(startTimeMs).toISOString(),
                          },
                        ];
                      }
                      return [];
                    }
                  );
                  console.log(
                    `Fetched ${googleStepsEntries.length} Google Health step entries for user ${userId}`
                  );
                  rawHealthEntries =
                    rawHealthEntries.concat(googleStepsEntries);
                }
              } catch (apiError: unknown) {
                console.error(
                  `Error fetching Google Fitness API for conn ${connection.id}:`,
                  apiError
                );
                // Handle potential 401/invalid_grant errors
              }
            }
          }
        } catch (err) {
          console.error("Error processing Google Health data:", err);
        }
      }

      // --- Data Aggregation by Date and Type (Revised Logic) ---
      const aggregatedData: { [key: string]: HealthEntry } = {}; // Key: "YYYY-MM-DD:type"

      // Sort raw entries to process manual before google_health for the same day/type
      rawHealthEntries.sort((a, b) => {
        if (a.entry_date !== b.entry_date)
          return a.entry_date.localeCompare(b.entry_date);
        if (a.type !== b.type) return a.type.localeCompare(b.type);
        // Process manual before google_health if date/type are same
        return a.sourceProvider === "manual" ? -1 : 1;
      });

      for (const entry of rawHealthEntries) {
        // Use a composite key for aggregation, specific for steps, unique ID for others
        const key =
          entry.type === "steps"
            ? `${entry.entry_date}:${entry.type}`
            : `${entry.entry_date}:${entry.type}:${entry.id}`; // Unique key for non-step types

        const existingEntry = aggregatedData[key];

        if (!existingEntry) {
          // If no entry exists for this key, add it
          aggregatedData[key] = entry;
        } else if (entry.type === "steps") {
          // If it's a step entry and one already exists for this day:
          if (entry.sourceProvider === "google_health") {
            // Google data overwrites whatever was there (manual or older google)
            aggregatedData[key] = {
              ...entry,
              // Optionally preserve manual ID if overwriting manual?
              // id: existingEntry.sourceProvider === 'manual' ? existingEntry.id : entry.id,
            };
          }
          // If current entry is manual and existing is google, do nothing (keep google)
          // If both are manual, the sort order ensures the first one added is kept (or implement latest logic if needed)
        }
        // For non-step types, the unique key prevents overwriting, keeping all entries
      }

      const finalHealthEntries = Object.values(aggregatedData);

      // Return aggregated entries and connection status
      res
        .status(200)
        .json({ healthEntries: finalHealthEntries, isGoogleHealthConnected });
    } catch (error) {
      console.error("Error in GET /api/health handler:", error);
      next(error); // Pass error to global handler
    }
  }
);

// POST /api/health/manual - Add a manual health entry
router.post(
  "/manual",
  ensureAuthenticated,
  async (
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
        res
          .status(400)
          .json({ message: "Invalid data type for type or value" });
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
          connError ||
          new Error("Manual health connection ID not found/created")
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
  }
);

// DELETE /api/health/manual/:entryId - Delete a specific manual health entry
router.delete(
  "/manual/:entryId",
  ensureAuthenticated,
  async (
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
  }
);

export default router;
