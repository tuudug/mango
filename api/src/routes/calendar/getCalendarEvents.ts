import { Response, NextFunction } from "express";
import { google, calendar_v3, Auth } from "googleapis"; // Import Auth for types
import { GaxiosError } from "gaxios";
import { supabaseAdmin } from "../../supabaseClient"; // Keep admin client
import { encrypt, decrypt } from "../../utils/crypto"; // Import encrypt/decrypt
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  CalendarItem,
  StoredGoogleCredentials,
  DecryptedGoogleCredentials,
} from "../../types/calendar"; // Import shared types
import {
  InternalServerError,
  AuthenticationError, // For token/auth issues
  // NotFoundError, // Not typically used in GET list endpoints unless required
  // BadRequestError, // Not typically used in basic GET list endpoints
} from "../../utils/errors"; // Import custom errors

export const getCalendarEvents = async (
  req: AuthenticatedRequest, // Use exported interface
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Use properties from the interface
    const userId = req.userId;
    const supabaseUserClient = req.supabase; // Get request-scoped client

    if (!userId || !supabaseUserClient) {
      return next(
        new InternalServerError("Authentication context not found on request.")
      );
    }
    let allEvents: CalendarItem[] = [];
    let isGoogleConnected = false; // Default to false

    // 0. Check Google Connection Status (Use admin client for this check)
    try {
      // Use { count: 'exact', head: true } to efficiently check existence
      const { count, error: googleConnError } = await supabaseAdmin
        .from("data_source_connections")
        .select("*", { count: "exact", head: true }) // Select '*' is fine with head:true
        .eq("user_id", userId)
        .eq("provider", "google_calendar");

      if (googleConnError) {
        console.error(
          "Error checking Google connection status:",
          googleConnError
        );
        // Don't throw, proceed assuming not connected for this request
      } else if (count !== null && count > 0) {
        // Check if count is greater than 0
        isGoogleConnected = true;
        console.log(
          `Google Calendar connection found for user ${userId} (count: ${count})`
        );
      } else {
        console.log(
          `No Google Calendar connection found for user ${userId} (count: ${count})`
        );
      }
    } catch (err) {
      console.error("Unexpected error checking Google connection:", err);
    }

    // 1. Fetch Manual Events (Use request-scoped client - RLS applies)
    try {
      const { data: manualEventsData, error: manualError } =
        await supabaseUserClient // USE REQUEST-SCOPED CLIENT
          .from("manual_calendar_events")
          .select("id, title, event_date, connection_id, is_all_day")
          .eq("user_id", userId); // RLS also checks auth.uid() implicitly

      if (manualError) {
        console.error(
          `Supabase error fetching manual calendar events for user ${userId}:`,
          manualError
        );
        // Don't stop the whole process, just log and continue
        // return next(new InternalServerError("Failed to fetch manual calendar events"));
      } else if (manualEventsData) {
        // Explicitly type the event parameter in map
        const manualItems: CalendarItem[] = manualEventsData.map(
          (event: {
            id: string;
            title: string;
            event_date: string;
            connection_id: string;
            is_all_day: boolean | null;
          }) => ({
            id: event.id,
            sourceInstanceId: event.connection_id,
            sourceProvider: "manual", // Add source provider
            title: event.title,
            date: event.event_date,
            isAllDay: event.is_all_day ?? true,
          })
        );
        allEvents = allEvents.concat(manualItems);
        console.log(
          `Fetched ${manualItems.length} manual events for user ${userId}`
        );
      }
    } catch (err) {
      console.error("Error processing manual events:", err);
    }

    // 2. Fetch Google Calendar Events (logic remains the same, uses admin client for tokens)
    try {
      const { data: connections, error: connError } = await supabaseAdmin
        .from("data_source_connections")
        .select("id, credentials")
        .eq("user_id", userId)
        .eq("provider", "google_calendar");

      if (connError) {
        console.error(
          `Supabase error fetching Google connections for user ${userId}:`,
          connError
        );
        // Don't stop the whole process, just log and continue
        // return next(new InternalServerError("Failed to fetch Google connections"));
      } else if (connections && connections.length > 0) {
        console.log(
          `Found ${connections.length} Google Calendar connection(s) for user ${userId}`
        );
        for (const connection of connections) {
          const storedCredentials =
            connection.credentials as StoredGoogleCredentials;
          let decryptedCreds: DecryptedGoogleCredentials | null = null;

          // Decrypt tokens
          try {
            if (!storedCredentials?.access_token) {
              console.warn(
                `Skipping connection ${connection.id}: Missing encrypted access token.`
              );
              continue;
            }
            decryptedCreds = {
              access_token: decrypt(storedCredentials.access_token),
              refresh_token: storedCredentials.refresh_token
                ? decrypt(storedCredentials.refresh_token)
                : null,
              expiry_date: storedCredentials.expiry_date,
              scope: storedCredentials.scope,
            };
          } catch (decryptionError) {
            console.error(
              `Failed to decrypt credentials for connection ${connection.id}:`,
              decryptionError
            );
            // Consider marking this connection as invalid in the DB?
            continue; // Skip this connection if decryption fails
          }

          if (decryptedCreds?.access_token) {
            try {
              const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
              );

              oauth2Client.setCredentials({
                access_token: decryptedCreds.access_token,
                refresh_token: decryptedCreds.refresh_token ?? undefined, // Pass undefined if null
                expiry_date: decryptedCreds.expiry_date ?? undefined,
                scope: decryptedCreds.scope,
              });

              // --- Handle Token Refresh ---
              oauth2Client.on("tokens", async (tokens: Auth.Credentials) => {
                console.log(
                  `Google token refreshed for connection ${connection.id}`
                );
                let newEncryptedAccessToken: string | null = null;
                let newEncryptedRefreshToken: string | null = null;

                try {
                  if (tokens.access_token) {
                    newEncryptedAccessToken = encrypt(tokens.access_token);
                  }
                  // Refresh token might not always be returned, only update if it is
                  if (tokens.refresh_token) {
                    newEncryptedRefreshToken = encrypt(tokens.refresh_token);
                    console.log(
                      `Received new refresh token for connection ${connection.id}`
                    );
                  }

                  const updatedCredentials: Partial<StoredGoogleCredentials> = {
                    access_token:
                      newEncryptedAccessToken ?? storedCredentials.access_token, // Keep old if no new one
                    expiry_date: tokens.expiry_date,
                    scope: tokens.scope,
                  };

                  // Only update refresh token if a new one was provided
                  if (newEncryptedRefreshToken) {
                    updatedCredentials.refresh_token = newEncryptedRefreshToken;
                  }

                  // Update Supabase using ADMIN client
                  const { error: updateError } = await supabaseAdmin
                    .from("data_source_connections")
                    .update({ credentials: updatedCredentials })
                    .eq("id", connection.id);

                  if (updateError) {
                    console.error(
                      `Failed to update refreshed tokens in Supabase for connection ${connection.id}:`,
                      updateError
                    );
                  } else {
                    console.log(
                      `Successfully updated refreshed tokens in Supabase for connection ${connection.id}`
                    );
                  }
                } catch (encError) {
                  console.error(
                    `Failed to encrypt refreshed tokens for connection ${connection.id}:`,
                    encError
                  );
                }
              });
              // --- End Token Refresh Handler ---

              const calendar = google.calendar({
                version: "v3",
                auth: oauth2Client,
              });
              // Calculate time range: -7 days to +30 days from now
              const now = new Date();
              const timeMinDate = new Date(now);
              timeMinDate.setDate(now.getDate() - 7); // 7 days ago
              const timeMaxDate = new Date(now);
              timeMaxDate.setDate(now.getDate() + 30); // 30 days from now

              const timeMin = timeMinDate.toISOString();
              const timeMax = timeMaxDate.toISOString();

              const eventsRes = await calendar.events.list({
                calendarId: "primary",
                timeMin,
                timeMax,
                maxResults: 50,
                singleEvents: true,
                orderBy: "startTime",
              });

              const googleEvents = eventsRes.data.items;
              if (googleEvents && googleEvents.length > 0) {
                const transformedGoogleEvents: CalendarItem[] = googleEvents
                  .map(
                    (event: calendar_v3.Schema$Event): CalendarItem | null => {
                      const eventDate =
                        event.start?.date ||
                        event.start?.dateTime?.split("T")[0];
                      if (!event.id || !event.summary || !eventDate)
                        return null;
                      return {
                        id: event.id,
                        sourceInstanceId: connection.id,
                        sourceProvider: "google_calendar", // Add source provider
                        title: event.summary,
                        date: eventDate,
                        isAllDay: !!event.start?.date,
                        // Extract time if available and not all-day
                        startTime:
                          event.start?.dateTime && !event.start.date
                            ? event.start.dateTime.substring(11, 16) // HH:MM
                            : undefined,
                        endTime:
                          event.end?.dateTime && !event.end.date
                            ? event.end.dateTime.substring(11, 16) // HH:MM
                            : undefined,
                      };
                    }
                  )
                  .filter((item): item is CalendarItem => item !== null);
                allEvents = allEvents.concat(transformedGoogleEvents);
                console.log(
                  `Fetched ${transformedGoogleEvents.length} Google events for connection ${connection.id}`
                );
              }
            } catch (apiError: unknown) {
              console.error(
                `Error fetching Google Calendar API for connection ${connection.id}:`,
                apiError instanceof Error ? apiError.message : apiError
              );
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
                // Pass AuthenticationError to trigger re-auth flow on frontend potentially
                next(
                  new AuthenticationError(
                    "Google API authorization error. Re-authentication required."
                  )
                );
              } else {
                // Pass other Google API errors as InternalServerError
                next(
                  new InternalServerError(
                    "Failed to fetch Google Calendar events."
                  )
                );
              }
            }
            // Extra ); removed here
          }
        }
      }
    } catch (err) {
      console.error("Error processing Google Calendar events:", err);
    }

    // 3. Return merged events AND connection status
    res.status(200).json({ events: allEvents, isGoogleConnected });
  } catch (error) {
    console.error("Error in GET /api/calendar handler:", error);
    next(error);
  }
};
