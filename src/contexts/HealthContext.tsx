import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback, // Import useCallback
} from "react";
import { useAuth } from "./AuthContext"; // Import useAuth

// Define the structure for health entries from backend
export interface HealthEntry {
  id: string;
  connection_id: string;
  entry_date: string;
  type: string; // e.g., 'steps'
  value: number;
  created_at: string;
  updated_at: string;
  sourceProvider: "manual" | "google_health"; // Added source provider
}

// Define the shape of the context data
interface HealthContextType {
  healthData: HealthEntry[]; // Store raw entries
  isLoading: boolean;
  error: string | null;
  fetchHealthData: () => Promise<void>;
  addManualHealthEntry: (entry: {
    entry_date: string;
    type: string;
    value: number;
  }) => Promise<void>;
  deleteManualHealthEntry: (entryId: string) => Promise<void>; // Add delete function
  // Add connection status and actions
  isGoogleHealthConnected: boolean;
  connectGoogleHealth: () => void;
  disconnectGoogleHealth: () => Promise<void>;
}

// Create the context with a default value
const HealthContext = createContext<HealthContextType | undefined>(undefined);

// Define the props for the provider component
interface HealthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const HealthProvider: React.FC<HealthProviderProps> = ({ children }) => {
  const [healthData, setHealthData] = useState<HealthEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleHealthConnected, setIsGoogleHealthConnected] =
    useState<boolean>(false); // Add state
  const { session } = useAuth(); // Get session for auth token

  // Helper to get auth headers (similar to CalendarContext)
  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  // Function to fetch health data from the backend API
  const fetchHealthData = useCallback(async () => {
    if (!session) return; // Don't fetch if not logged in

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/health", {
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Expect response format: { healthEntries: HealthEntry[], isGoogleHealthConnected: boolean }
      const data: {
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
      } = await response.json();
      setHealthData(data.healthEntries || []); // Ensure it's an array
      // Set connection status from backend
      setIsGoogleHealthConnected(data.isGoogleHealthConnected);
      console.log(
        "Google Health Connected Status (from backend):",
        data.isGoogleHealthConnected
      );
    } catch (e) {
      console.error("Failed to fetch health data:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setHealthData([]); // Clear data on error
      setIsGoogleHealthConnected(false); // Assume disconnected on error
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]);

  // Fetch data on initial mount or when session changes
  useEffect(() => {
    if (session) {
      fetchHealthData();
    } else {
      setHealthData([]); // Clear data if logged out
      setIsGoogleHealthConnected(false); // Reset connection status
    }
  }, [session, fetchHealthData]);

  // Function to add a new manual health entry via backend
  const addManualHealthEntry = async (entry: {
    entry_date: string;
    type: string;
    value: number;
  }) => {
    if (!session) {
      setError("You must be logged in to add health data.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/health/manual", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(entry),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore parsing error */
        }
        throw new Error(errorMsg);
      }
      // Re-fetch health data to get the updated list including the new one
      await fetchHealthData();
    } catch (e) {
      console.error("Failed to add manual health entry:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      // Optionally, revert optimistic update here if implemented
    } finally {
      setIsLoading(false);
    }
  };

  // Function to initiate Google Health connection
  const connectGoogleHealth = () => {
    // Redirect the browser to the backend endpoint that starts the OAuth flow
    window.location.href = "/api/auth/google-health/start";
  };

  // Function to disconnect Google Health
  const disconnectGoogleHealth = async () => {
    if (!session) {
      setError("You must be logged in to disconnect Google Health.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // TODO: Implement backend route POST /api/auth/google-health/disconnect
      // For now, just log and refetch to update status based on backend check
      console.warn("Backend disconnect for Google Health not implemented yet.");
      // const response = await fetch("/api/auth/google-health/disconnect", {
      //   method: "POST",
      //   headers: getAuthHeaders(),
      // });
      // if (!response.ok) { throw new Error(...) }

      // Refetch data - the backend GET /api/health should report disconnected status
      await fetchHealthData();
    } catch (e) {
      console.error("Failed to disconnect Google Health:", e);
      setError(
        e instanceof Error
          ? e.message
          : "An unknown error occurred during disconnect"
      );
      // Refetch even on error
      await fetchHealthData();
    } finally {
      // setIsLoading(false); // fetchHealthData handles this
    }
  };

  // Function to delete a manual health entry via backend
  const deleteManualHealthEntry = async (entryId: string) => {
    if (!session) {
      setError("You must be logged in to delete health data.");
      return;
    }
    setIsLoading(true); // Indicate loading, maybe disable delete button?
    setError(null);
    try {
      const response = await fetch(`/api/health/manual/${entryId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore parsing error */
        }
        throw new Error(errorMsg);
      }
      // Refetch data to update the list
      await fetchHealthData();
    } catch (e) {
      console.error("Failed to delete manual health entry:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      // Refetch even on error to ensure UI consistency if delete partially failed
      await fetchHealthData();
    } finally {
      // setIsLoading(false); // fetchHealthData handles this
    }
  };

  // Provide the context value to children
  const value = {
    healthData,
    isLoading,
    error,
    fetchHealthData,
    addManualHealthEntry,
    deleteManualHealthEntry, // Add delete function
    isGoogleHealthConnected,
    connectGoogleHealth,
    disconnectGoogleHealth,
  };

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
};

// Custom hook to use the Health context
export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
};
