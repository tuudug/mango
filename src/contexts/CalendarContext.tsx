import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useCallback,
} from "react";
import { CalendarItem } from "@/types/datasources"; // Import the new type
import { useAuth } from "./AuthContext"; // Import useAuth to get session token

// Define the context shape using CalendarItem
interface CalendarContextType {
  events: CalendarItem[];
  isLoading: boolean; // Add loading state
  error: string | null; // Add error state
  fetchEvents: () => Promise<void>;
  addManualEvent: (eventData: { title: string; date: string }) => Promise<void>;
  deleteManualEvent: (eventId: string) => Promise<void>;
  // Add connection status and actions
  isGoogleConnected: boolean;
  connectGoogleCalendar: () => void;
  disconnectGoogleCalendar: () => Promise<void>;
  confirmGoogleConnection: () => void;
  fetchEventsIfNeeded: () => void; // Add throttled fetch
}

// Create the context with a default value
const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

// Define the props for the provider component
interface CalendarProviderProps {
  children: ReactNode;
}

// Create the provider component
export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
}) => {
  const [events, setEvents] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null); // Track last fetch time
  const { session } = useAuth(); // Get session from AuthContext

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Helper to get auth headers
  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  // Function to fetch events from the backend API
  const fetchEvents = useCallback(async () => {
    if (!session) return; // Don't fetch if not logged in

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar", {
        headers: getAuthHeaders(), // Add auth header
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Expect response format: { events: CalendarItem[], isGoogleConnected: boolean }
      const data: { events: CalendarItem[]; isGoogleConnected: boolean } =
        await response.json();
      setEvents(data.events);
      // Set connection status directly from backend response
      setIsGoogleConnected(data.isGoogleConnected);
      setLastFetchTime(new Date()); // Update last fetch time on success
      console.log(
        "Google Connected Status (from backend):",
        data.isGoogleConnected
      );
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setEvents([]); // Clear events on error
      setIsGoogleConnected(false); // Assume disconnected on error
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]); // Add session and getAuthHeaders to dependencies

  // Throttled fetch function
  const fetchEventsIfNeeded = useCallback(() => {
    if (isLoading) return; // Don't fetch if already loading

    const now = new Date();
    if (
      !lastFetchTime ||
      now.getTime() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS
    ) {
      console.log("Refresh interval elapsed, fetching events...");
      fetchEvents();
    } else {
      console.log("Skipping fetch, refresh interval not elapsed.");
    }
  }, [isLoading, lastFetchTime, fetchEvents]); // Add dependencies

  // Fetch events (if needed) on initial mount or when session changes
  useEffect(() => {
    if (session) {
      // Only fetch if session exists and needed
      fetchEventsIfNeeded();
    } else {
      setEvents([]); // Clear events if logged out
      setLastFetchTime(null); // Reset last fetch time on logout
      setIsGoogleConnected(false); // Reset connection status on logout
    }
    // Intentionally not depending on fetchEventsIfNeeded to avoid loop,
    // but depend on session to trigger check on login/logout.
  }, [session]); // fetchEventsIfNeeded is intentionally omitted from deps

  // Effect to refetch data when window becomes visible (throttled)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Window became visible, checking if fetch needed...");
        fetchEventsIfNeeded();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup listener on unmount
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEventsIfNeeded]); // Depend on the throttled fetch function

  // Function to add a new manual event via backend
  const addManualEvent = async (eventData: { title: string; date: string }) => {
    if (!session) {
      setError("You must be logged in to add events.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/calendar/manual", {
        method: "POST",
        headers: getAuthHeaders(), // Add auth header
        body: JSON.stringify(eventData),
      });
      if (!response.ok) {
        // Try to get error message from backend response body
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          // Removed unused '_'
          /* Ignore parsing error */
        }
        throw new Error(errorMsg);
      }
      // Re-fetch events to get the updated list including the new one
      await fetchEvents();
    } catch (e) {
      console.error("Failed to add manual event:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a manual event via backend
  const deleteManualEvent = async (eventId: string) => {
    if (!session) {
      setError("You must be logged in to delete events.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/calendar/manual/${eventId}`, {
        method: "DELETE",
        headers: getAuthHeaders(), // Add auth header
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          // Removed unused '_'
          /* Ignore parsing error */
        }
        throw new Error(errorMsg);
      }
      // Re-fetch events to get the updated list
      await fetchEvents();
    } catch (e) {
      console.error("Failed to delete manual event:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Function to initiate Google Calendar connection
  const connectGoogleCalendar = () => {
    // Redirect the browser to the backend endpoint that starts the OAuth flow
    // The backend route needs ensureAuthenticated to link the session
    window.location.href = "/api/auth/google/start";
  };

  // Function to disconnect Google Calendar
  const disconnectGoogleCalendar = async () => {
    if (!session) {
      setError("You must be logged in to disconnect.");
      return;
    }
    setIsLoading(true); // Indicate loading state
    setError(null);
    try {
      const response = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          // Removed unused '_'
          /* Ignore parsing error */
        }
        throw new Error(errorMsg);
      }
      // On successful disconnect, refetch events
      await fetchEvents();
    } catch (e) {
      console.error("Failed to disconnect Google Calendar:", e);
      setError(
        e instanceof Error
          ? e.message
          : "An unknown error occurred during disconnect"
      );
      // Optionally refetch events even on error to see if state changed partially
      await fetchEvents();
    } finally {
      // Intentionally keep isLoading true until fetchEvents finishes if successful
      // setIsLoading(false); // fetchEvents will set this
    }
  };

  // Function called after successful OAuth redirect to optimistically update UI
  const confirmGoogleConnection = () => {
    console.log("Confirming Google Connection - setting state and fetching.");
    setIsGoogleConnected(true); // Optimistically set state
    fetchEvents(); // Trigger fetch to get actual data
  };

  // Provide the context value to children
  const value = {
    events,
    isLoading,
    error,
    fetchEvents,
    addManualEvent,
    deleteManualEvent,
    // Add new state and functions
    isGoogleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    confirmGoogleConnection,
    fetchEventsIfNeeded, // Add new function
  };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

// Custom hook to use the Calendar context
export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};
