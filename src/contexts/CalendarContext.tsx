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
import { useToast } from "./ToastContext"; // Import useToast
import { authenticatedFetch, ApiError } from "@/lib/apiClient"; // Import the new utility and error class

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
  fetchEventsIfNeeded: () => void;
  lastFetchTime: Date | null; // Expose last fetch time
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
  const { showToast } = useToast(); // Get showToast

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Removed getAuthHeaders helper

  // Function to fetch events from the backend API
  const fetchEvents = useCallback(async () => {
    if (!session) return; // Don't fetch if not logged in

    setIsLoading(true);
    setError(null);
    try {
      // Use authenticatedFetch
      const data = await authenticatedFetch<{
        events: CalendarItem[];
        isGoogleConnected: boolean;
      }>("/api/calendar", "GET", session);

      setEvents(data.events || []); // Ensure events is always an array
      setIsGoogleConnected(data.isGoogleConnected);
      setLastFetchTime(new Date()); // Update last fetch time on success
      console.log(
        "Google Connected Status (from backend):",
        data.isGoogleConnected
      );
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to fetch calendar data";
      setError(errorMsg);
      showToast({
        title: "Calendar Error",
        description: errorMsg,
        variant: "error",
      });
      setEvents([]); // Clear events on error
      setIsGoogleConnected(false); // Assume disconnected on error
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]); // Removed getAuthHeaders from dependencies

  // Throttled fetch function - logic remains the same
  const fetchEventsIfNeeded = useCallback(() => {
    if (isLoading) return;

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
  }, [isLoading, lastFetchTime, fetchEvents]);

  // Initial fetch logic remains the same
  useEffect(() => {
    if (session) {
      fetchEventsIfNeeded();
    } else {
      setEvents([]);
      setLastFetchTime(null);
      setIsGoogleConnected(false);
    }
  }, [session, fetchEventsIfNeeded]); // Added fetchEventsIfNeeded dependency

  // Visibility change logic remains the same
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("Window became visible, checking if fetch needed...");
        fetchEventsIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchEventsIfNeeded]);

  // Function to add a new manual event via backend
  const addManualEvent = async (eventData: { title: string; date: string }) => {
    if (!session) {
      setError("You must be logged in to add events.");
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true); // Consider specific loading state?
    setError(null);
    try {
      // Use authenticatedFetch for POST
      await authenticatedFetch<void>(
        "/api/calendar/manual",
        "POST",
        session,
        eventData
      );
      // Re-fetch events to get the updated list including the new one
      await fetchEvents();
      showToast({ title: "Event Added", variant: "success" });
    } catch (e) {
      console.error("Failed to add manual event:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to add event";
      setError(errorMsg);
      showToast({
        title: "Add Event Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Function to delete a manual event via backend
  const deleteManualEvent = async (eventId: string) => {
    if (!session) {
      setError("You must be logged in to delete events.");
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    // Consider optimistic update? For now, just loading state.
    setIsLoading(true);
    setError(null);
    try {
      // Use authenticatedFetch for DELETE
      await authenticatedFetch<void>(
        `/api/calendar/manual/${eventId}`,
        "DELETE",
        session
      );
      // Re-fetch events to get the updated list
      await fetchEvents();
      showToast({ title: "Event Deleted", variant: "success" });
    } catch (e) {
      console.error("Failed to delete manual event:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to delete event";
      setError(errorMsg);
      showToast({
        title: "Delete Event Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch even on error?
      await fetchEvents();
    } finally {
      setIsLoading(false);
    }
  };

  // Function to initiate Google Calendar connection - remains the same
  const connectGoogleCalendar = () => {
    window.location.href = "/api/auth/google/start";
  };

  // Function to disconnect Google Calendar
  const disconnectGoogleCalendar = async () => {
    if (!session) {
      setError("You must be logged in to disconnect.");
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true); // Indicate loading state
    setError(null);
    try {
      // Use authenticatedFetch for POST (no body needed for this endpoint)
      await authenticatedFetch<void>(
        "/api/auth/google/disconnect",
        "POST",
        session
      );
      // On successful disconnect, refetch events which will update connection status
      await fetchEvents();
      showToast({ title: "Google Calendar Disconnected", variant: "success" });
    } catch (e) {
      console.error("Failed to disconnect Google Calendar:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to disconnect Google Calendar";
      setError(errorMsg);
      showToast({
        title: "Disconnect Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch events even on error to get latest state
      await fetchEvents();
    } finally {
      // isLoading will be set to false by the final fetchEvents call
    }
  };

  // Function called after successful OAuth redirect - remains the same
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
    isGoogleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
    confirmGoogleConnection,
    fetchEventsIfNeeded,
    lastFetchTime,
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
