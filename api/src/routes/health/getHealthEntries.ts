import { Request, Response, NextFunction } from "express"; // Ensure Request is imported
import { google, fitness_v1, Auth } from "googleapis";
import { GaxiosResponse, GaxiosError } from "gaxios"; // Import GaxiosError
import { supabaseAdmin } from "../../supabaseClient";
// Module augmentation handles req.user, req.supabase
import { encrypt, decrypt } from "../../utils/crypto";
import { addDays, startOfDay, endOfDay, format } from "date-fns";
import {
  HealthEntry,
  StoredGoogleCredentials,
  DecryptedGoogleCredentials,
} from "../../types/health";
import { updateQuestProgress } from "../../services/questService"; // Import quest service
import { InternalServerError, AuthenticationError } from "../../utils/errors"; // Import custom errors

// Define the expected structure for health settings
interface HealthSettings {
  daily_steps_goal: number;
  weight_goal: number | null; // Add weight_goal (can be null)
}

export const getHealthEntries = async (
  req: Request, // Use explicit Request type
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Cast to any to access augmented properties due to TS inference issues
    const supabaseUserClient = (req as any).supabase;
    const user = (req as any).user;

    // Check user and user.id
    if (!user || !user.id || !supabaseUserClient) {
      // Use next with custom error for server/middleware issues
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    const currentUserId = user.id; // Use user.id consistently

    let rawHealthEntries: HealthEntry[] = [];
    let isGoogleHealthConnected = false;

    // 0. Check Google Health Connection Status
    try {
      const { count, error: googleConnError } = await supabaseAdmin
        .from("data_source_connections")
        .select("id", { count: "exact", head: true }) // Only need count
        .eq("user_id", currentUserId)
        .eq("provider", "google_health");

      if (googleConnError) {
        console.error(
          "Error checking Google Health connection:",
          googleConnError
        );
      } else if (count !== null && count > 0) {
        isGoogleHealthConnected = true;
        console.log(`Google Health connection found for user ${currentUserId}`);
      }
    } catch (err) {
      console.error("Unexpected error checking Google Health connection:", err);
    }

    // 1. Fetch Manual Health Entries
    try {
      const { data: manualEntries, error: manualError } =
        await supabaseUserClient
          .from("manual_health_entries")
          .select(
            "id, connection_id, entry_date, type, value, created_at, updated_at"
          )
          .eq("user_id", currentUserId);

      if (manualError) {
        console.error(
          `Supabase error fetching manual health entries for user ${currentUserId}:`,
          manualError
        );
        // Don't stop the whole process, just log and continue
        // return next(new InternalServerError("Failed to fetch manual health entries"));
      } else if (manualEntries) {
        // Define type for the mapped entry based on selected columns
        type ManualEntryData = {
          id: string;
          connection_id: string | null;
          entry_date: string;
          type: string;
          value: number;
          created_at: string;
          updated_at: string;
        };
        const manualItems: HealthEntry[] = manualEntries.map(
          (entry: ManualEntryData) => ({
            ...entry,
            sourceProvider: "manual",
          })
        );
        rawHealthEntries = rawHealthEntries.concat(manualItems);
        console.log(
          `Fetched ${manualItems.length} manual health entries for user ${currentUserId}`
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
          .eq("user_id", currentUserId)
          .eq("provider", "google_health");

        if (connError) {
          console.error(
            `Supabase error fetching Google Health connections for user ${currentUserId}:`,
            connError
          );
          // Don't stop the whole process, just log and continue
          // return next(new InternalServerError("Failed to fetch Google Health connections"));
        } else if (connections) {
          // Check if connections is not null/undefined
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
                expiry_date: storedCredentials.expiry_date,
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
                  expiry_date: decryptedCreds.expiry_date ?? undefined,
                });

                // Handle Token Refresh
                oauth2Client.on("tokens", async (tokens: Auth.Credentials) => {
                  console.log(
                    `Google Health token refreshed for connection ${connection.id}`
                  );
                  let newEncryptedAccessToken: string | null = null;
                  let newEncryptedRefreshToken: string | null = null;
                  try {
                    if (tokens.access_token)
                      newEncryptedAccessToken = encrypt(tokens.access_token);
                    if (tokens.refresh_token)
                      newEncryptedRefreshToken = encrypt(tokens.refresh_token);

                    const currentCredentials =
                      storedCredentials || ({} as StoredGoogleCredentials);
                    const updatedCredentials: StoredGoogleCredentials = {
                      ...currentCredentials,
                      access_token:
                        newEncryptedAccessToken ??
                        currentCredentials.access_token,
                      expiry_date: tokens.expiry_date,
                      scope: tokens.scope ?? currentCredentials.scope,
                    };
                    if (newEncryptedRefreshToken)
                      updatedCredentials.refresh_token =
                        newEncryptedRefreshToken;

                    const { error: updateError } = await supabaseAdmin
                      .from("data_source_connections")
                      .update({ credentials: updatedCredentials })
                      .eq("id", connection.id);

                    if (updateError)
                      console.error(
                        `Failed to update refreshed Google Health tokens for conn ${connection.id}:`,
                        updateError
                      );
                    else
                      console.log(
                        `Successfully updated refreshed Google Health tokens for conn ${connection.id}`
                      );
                  } catch (encError) {
                    console.error(
                      `Failed to encrypt refreshed Google Health tokens for conn ${connection.id}:`,
                      encError
                    );
                  }
                });

                const fitness = google.fitness({
                  version: "v1",
                  auth: oauth2Client,
                });
                const endTime = endOfDay(new Date());
                const startTime = startOfDay(addDays(endTime, -6)); // Fetch last 7 days including today

                const requestBody: fitness_v1.Params$Resource$Users$Dataset$Aggregate["requestBody"] =
                  {
                    aggregateBy: [
                      {
                        dataTypeName: "com.google.step_count.delta",
                        dataSourceId:
                          "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps",
                      },
                    ],
                    bucketByTime: { durationMillis: "86400000" }, // Daily buckets
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
                            id: `google-steps-${entryDate}`, // Consistent ID for aggregation
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
                    `Fetched ${googleStepsEntries.length} Google Health step entries for user ${currentUserId}`
                  );
                  rawHealthEntries =
                    rawHealthEntries.concat(googleStepsEntries);
                }
              } catch (apiError: unknown) {
                console.error(
                  `Error fetching Google Fitness API for conn ${connection.id}:`,
                  apiError instanceof Error ? apiError.message : apiError // Log message if Error instance
                );
                // Check for specific Google API errors (like auth failure)
                if (
                  apiError instanceof GaxiosError &&
                  (apiError.code === "401" ||
                    (apiError.response?.data?.error === "invalid_grant" &&
                      apiError.response?.status === 400)) // Handle expired/invalid refresh token
                ) {
                  console.warn(
                    `Google API authorization error (token expired/invalid?) for connection ${connection.id}. Needs re-authentication.`
                  );
                  // TODO: Mark connection as needing re-auth in DB?
                  // We log the warning but continue to the next connection if possible,
                  // rather than failing the entire request with next().
                } else {
                  // Log other Google API errors but continue processing other connections/data sources.
                  console.error(
                    `Non-authentication Google API error for connection ${connection.id}.`
                  );
                  // If a single connection failure should stop everything, uncomment the next line:
                  // next(new InternalServerError("Failed to fetch Google Fitness data."));
                }
              }
            }
          }
        }
      } catch (err) {
        // This catch block handles errors specifically within the Google Health processing section (e.g., DB connection fetch)
        console.error("Error processing Google Health data:", err);
        // Allow the request to continue to return manual data if available.
        // If this error should stop the request, uncomment the next line:
        // next(new InternalServerError("Failed to process Google Health data."));
      }
    }

    // --- Data Aggregation by Date and Type ---
    const aggregatedData: { [key: string]: HealthEntry } = {};
    rawHealthEntries.sort((a, b) => {
      // Sort for consistent aggregation
      if (a.entry_date !== b.entry_date)
        return a.entry_date.localeCompare(b.entry_date);
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.sourceProvider === "manual" ? -1 : 1; // manual first
    });

    for (const entry of rawHealthEntries) {
      const key =
        entry.type === "steps"
          ? `${entry.entry_date}:${entry.type}`
          : `${entry.entry_date}:${entry.type}:${entry.id}`;
      const existingEntry = aggregatedData[key];

      if (!existingEntry) {
        aggregatedData[key] = entry;
      } else if (entry.type === "steps") {
        // Google data overwrites manual/older google for steps on the same day
        if (entry.sourceProvider === "google_health") {
          aggregatedData[key] = entry;
        }
        // If entry is manual and existing is google, keep google (do nothing)
      }
      // Non-step types use unique keys, so no overwriting needed here
    }
    const finalHealthEntries = Object.values(aggregatedData);

    // 3. Fetch Health Settings
    let healthSettings: HealthSettings = {
      daily_steps_goal: 10000,
      weight_goal: null,
    }; // Default settings
    try {
      const { data: settingsData, error: settingsError } =
        await supabaseUserClient
          .from("manual_health_settings")
          .select("daily_steps_goal, weight_goal") // Select both goals
          .eq("user_id", currentUserId)
          .maybeSingle();

      if (settingsError) {
        console.error(
          `Error fetching health settings for user ${currentUserId}:`,
          settingsError
        );
        // Don't fail the whole request, just use defaults
      } else if (settingsData) {
        // Assign fetched values, keeping defaults if null in DB
        healthSettings = {
          daily_steps_goal: settingsData.daily_steps_goal ?? 10000,
          weight_goal: settingsData.weight_goal, // Assign fetched weight_goal (can be null)
        };
      }
    } catch (settingsErr) {
      console.error(
        `Unexpected error fetching health settings for user ${currentUserId}:`,
        settingsErr
      );
      // Use defaults
    }

    // Return aggregated entries, connection status, and settings
    res.status(200).json({
      healthEntries: finalHealthEntries,
      isGoogleHealthConnected,
      healthSettings, // Include settings in the response
    });
    // Don't return yet, trigger quest updates

    // --- Trigger Quest Progress Update ---
    // Read user timezone from header, default to UTC if not provided
    const userTimezone = (req.headers["x-user-timezone"] as string) || "UTC";

    // Iterate through the final aggregated entries and trigger updates for steps
    for (const entry of finalHealthEntries) {
      if (entry.type === "steps") {
        updateQuestProgress(
          currentUserId,
          "steps_reach",
          { date: entry.entry_date, steps: entry.value },
          userTimezone,
          supabaseUserClient // Use the request-scoped client
        ).catch((questError) => {
          // Log errors from quest progress update, but don't fail the original request
          console.error(
            `[Quest Progress Update Error] Failed after fetching health entry for date ${entry.entry_date}:`,
            questError
          );
        });
      }
      // Add triggers for other health types here if needed in the future
    }
  } catch (error) {
    console.error("Error in GET /api/health handler:", error);
    // Ensure response is sent even if quest update call setup fails
    if (!res.headersSent) {
      next(error); // Pass error to global handler if response not sent
    }
    next(error); // Pass error to global handler
  }
};
