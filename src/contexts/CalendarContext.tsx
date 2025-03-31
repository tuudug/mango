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
  fetchEvents: () => Promise<void>; // Function to fetch from backend
  addManualEvent: (eventData: { title: string; date: string }) => Promise<void>; // Function to add manual event via backend
  deleteManualEvent: (eventId: string) => Promise<void>; // Function to delete manual event via backend
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
  const { session } = useAuth(); // Get session from AuthContext

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
      const data: CalendarItem[] = await response.json();
      setEvents(data);
    } catch (e) {
      console.error("Failed to fetch calendar events:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setEvents([]); // Clear events on error
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]); // Add session and getAuthHeaders to dependencies

  // Fetch events on initial mount or when session changes
  useEffect(() => {
    if (session) {
      // Only fetch if session exists
      fetchEvents();
    } else {
      setEvents([]); // Clear events if logged out
    }
  }, [session, fetchEvents]); // Depend on session

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
        } catch (_) {
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
        } catch (_) {
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

  // Provide the context value to children
  const value = {
    events,
    isLoading,
    error,
    fetchEvents,
    addManualEvent,
    deleteManualEvent,
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
