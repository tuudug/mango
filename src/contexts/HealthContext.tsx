import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext";

// Define the structure for health entries from backend
export interface HealthEntry {
  id: string;
  connection_id: string;
  entry_date: string;
  type: string;
  value: number;
  created_at: string;
  updated_at: string;
  sourceProvider: "manual" | "google_health";
}

// Define the shape of the context data
interface HealthContextType {
  healthData: HealthEntry[];
  isLoading: boolean;
  error: string | null;
  fetchHealthData: () => Promise<void>;
  addManualHealthEntry: (entry: {
    entry_date: string;
    type: string;
    value: number;
  }) => Promise<void>;
  deleteManualHealthEntry: (entryId: string) => Promise<void>;
  isGoogleHealthConnected: boolean;
  connectGoogleHealth: () => void;
  disconnectGoogleHealth: () => Promise<void>;
  fetchHealthDataIfNeeded: () => void; // Add throttled fetch
  lastFetchTime: Date | null; // Expose last fetch time
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

interface HealthProviderProps {
  children: ReactNode;
}

export const HealthProvider: React.FC<HealthProviderProps> = ({ children }) => {
  const [healthData, setHealthData] = useState<HealthEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleHealthConnected, setIsGoogleHealthConnected] =
    useState<boolean>(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null); // Track last fetch time
  const { session } = useAuth();

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const getAuthHeaders = useCallback(() => {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }
    return headers;
  }, [session]);

  const fetchHealthData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/health", {
        headers: getAuthHeaders(),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const data: {
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
      } = await response.json();
      setHealthData(data.healthEntries || []);
      setIsGoogleHealthConnected(data.isGoogleHealthConnected);
      setLastFetchTime(new Date()); // Update last fetch time
      console.log(
        "Google Health Connected Status (from backend):",
        data.isGoogleHealthConnected
      );
    } catch (e) {
      console.error("Failed to fetch health data:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      setHealthData([]);
      setIsGoogleHealthConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [session, getAuthHeaders]);

  const fetchHealthDataIfNeeded = useCallback(() => {
    if (isLoading) return;
    const now = new Date();
    if (
      !lastFetchTime ||
      now.getTime() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS
    ) {
      console.log("Health refresh interval elapsed, fetching...");
      fetchHealthData();
    } else {
      console.log("Skipping health fetch, refresh interval not elapsed.");
    }
  }, [isLoading, lastFetchTime, fetchHealthData]);

  useEffect(() => {
    if (session) {
      fetchHealthDataIfNeeded();
    } else {
      setHealthData([]);
      setIsGoogleHealthConnected(false);
      setLastFetchTime(null);
    }
  }, [session]); // Intentionally omit fetchHealthDataIfNeeded

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "Health Window became visible, checking if fetch needed..."
        );
        fetchHealthDataIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchHealthDataIfNeeded]);

  const addManualHealthEntry = async (entry: {
    entry_date: string;
    type: string;
    value: number;
  }) => {
    if (!session) {
      setError("You must be logged in.");
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
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      await fetchHealthData();
    } catch (e) {
      console.error("Failed to add manual health entry:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const connectGoogleHealth = () => {
    window.location.href = "/api/auth/google-health/start";
  };

  const disconnectGoogleHealth = async () => {
    if (!session) {
      setError("You must be logged in.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Use the generic disconnect endpoint and specify the provider
      const response = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ provider: "google_health" }), // Specify provider
      });
      if (!response.ok) {
        let errorMsg = `HTTP error! status: ${response.status}`;
        try {
          const errorBody = await response.json();
          errorMsg = errorBody.message || errorMsg;
        } catch {
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      console.log("Successfully disconnected Google Health via API.");
      await fetchHealthData(); // Refetch to update status (will set isLoading=false)
    } catch (e) {
      console.error("Failed to disconnect Google Health:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      await fetchHealthData(); // Refetch even on error to update state
    } finally {
      // No need for setIsLoading(false) here, fetchHealthData handles it
    }
  };

  const deleteManualHealthEntry = async (entryId: string) => {
    if (!session) {
      setError("You must be logged in.");
      return;
    }
    setIsLoading(true);
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
          /* Ignore */
        }
        throw new Error(errorMsg);
      }
      await fetchHealthData();
    } catch (e) {
      console.error("Failed to delete manual health entry:", e);
      setError(e instanceof Error ? e.message : "An unknown error occurred");
      await fetchHealthData(); // Refetch even on error
    } finally {
      // No need for setIsLoading(false) here, fetchHealthData handles it
    }
  };

  const value = {
    healthData,
    isLoading,
    error,
    fetchHealthData,
    addManualHealthEntry,
    deleteManualHealthEntry,
    isGoogleHealthConnected,
    connectGoogleHealth,
    disconnectGoogleHealth,
    fetchHealthDataIfNeeded,
    lastFetchTime, // Expose last fetch time
  };

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
};

export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
};
