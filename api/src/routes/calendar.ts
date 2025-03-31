import express, { Request, Response, Router, NextFunction } from "express";
import { google, calendar_v3 } from "googleapis";
import { GaxiosError } from "gaxios";
// Import createClient directly for request-scoped clients
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../supabaseClient"; // Keep admin client

const router: Router = express.Router();

// --- Types ---
interface AuthenticatedRequest extends Request {
  userId?: string;
  // Add a property to hold the request-scoped Supabase client
  supabase?: SupabaseClient;
}

interface CalendarItem {
  id: string;
  sourceInstanceId: string;
  title: string;
  date: string;
  isAllDay: boolean;
}

interface GoogleCalendarCredentials {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

// --- Middleware: Verify Supabase JWT & Create Request-Scoped Client ---
const ensureAuthenticated = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Server config error: Supabase URL or Anon Key missing.");
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Authorization header missing or invalid" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Bearer token missing" });
    return;
  }

  // Verify token using the globally imported supabase client (or admin)
  supabaseAdmin.auth
    .getUser(token) // Use admin client to verify token reliably server-side
    .then(({ data: { user }, error }) => {
      if (error || !user) {
        console.error("Supabase auth error verifying token:", error?.message);
        res.status(401).json({ message: "Invalid token or session" });
        return;
      }
      // Attach user ID
      req.userId = user.id;
      // Create and attach a request-scoped client authenticated as the user
      req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      console.log(`Authenticated API request for user ID: ${user.id}`);
      next();
    })
    .catch((err) => {
      console.error("Unexpected error during token verification:", err);
      res
        .status(500)
        .json({ message: "Internal server error during authentication" });
    });
};

// --- Routes ---

// GET /api/calendar - Fetch merged calendar events
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
      let allEvents: CalendarItem[] = [];

      // 1. Fetch Manual Events (Use request-scoped client - RLS applies)
      try {
        const { data: manualEventsData, error: manualError } =
          await supabaseUserClient // USE REQUEST-SCOPED CLIENT
            .from("manual_calendar_events")
            .select("id, title, event_date, connection_id, is_all_day")
            .eq("user_id", userId); // RLS also checks auth.uid() implicitly

        if (manualError) throw manualError;

        if (manualEventsData) {
          const manualItems: CalendarItem[] = manualEventsData.map((event) => ({
            id: event.id,
            sourceInstanceId: event.connection_id,
            title: event.title,
            date: event.event_date,
            isAllDay: event.is_all_day ?? true,
          }));
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

        if (connError) throw connError;

        if (connections && connections.length > 0) {
          console.log(
            `Found ${connections.length} Google Calendar connection(s) for user ${userId}`
          );
          for (const connection of connections) {
            const credentials =
              connection.credentials as GoogleCalendarCredentials;
            if (credentials?.access_token) {
              const accessToken = credentials.access_token;
              const refreshToken = credentials.refresh_token;

              try {
                const oauth2Client = new google.auth.OAuth2(
                  process.env.GOOGLE_CLIENT_ID,
                  process.env.GOOGLE_CLIENT_SECRET,
                  process.env.GOOGLE_REDIRECT_URI
                );
                oauth2Client.setCredentials({
                  access_token: accessToken,
                  refresh_token: refreshToken,
                });

                // TODO: Handle token refresh

                const calendar = google.calendar({
                  version: "v3",
                  auth: oauth2Client,
                });
                const timeMin = new Date().toISOString();
                const timeMax = new Date(
                  Date.now() + 30 * 24 * 60 * 60 * 1000
                ).toISOString();

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
                      (
                        event: calendar_v3.Schema$Event
                      ): CalendarItem | null => {
                        const eventDate =
                          event.start?.date ||
                          event.start?.dateTime?.split("T")[0];
                        if (!event.id || !event.summary || !eventDate)
                          return null;
                        return {
                          id: event.id,
                          sourceInstanceId: connection.id,
                          title: event.summary,
                          date: eventDate,
                          isAllDay: !!event.start?.date,
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
                  apiError.code === "401"
                ) {
                  console.warn(
                    `Google API authorization error for connection ${connection.id}.`
                  );
                }
              }
            } else {
              console.warn(
                `No valid credentials found for Google connection ${connection.id}`
              );
            }
          }
        }
      } catch (err) {
        console.error("Error processing Google Calendar events:", err);
      }

      // 3. Return merged events
      res.status(200).json(allEvents);
    } catch (error) {
      console.error("Error in GET /api/calendar handler:", error);
      next(error);
    }
  }
);

// POST /api/calendar/manual - Add a manual event
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
  }
);

// DELETE /api/calendar/manual/:eventId - Delete a manual event
router.delete(
  "/manual/:eventId",
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
  }
);

export default router;
