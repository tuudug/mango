import { authenticatedFetch } from "@/lib/apiClient"; // Import the new utility and error class
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext"; // Import useToast

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
  const { showToast } = useToast(); // Get showToast

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  // Removed getAuthHeaders helper

  const fetchHealthData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      // Use authenticatedFetch
      const data = await authenticatedFetch<{
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
      }>("/api/health", "GET", session);

      setHealthData(data.healthEntries || []);
      setIsGoogleHealthConnected(data.isGoogleHealthConnected);
      setLastFetchTime(new Date()); // Update last fetch time
      console.log(
        "Google Health Connected Status (from backend):",
        data.isGoogleHealthConnected
      );
    } catch (e) {
      console.error("Failed to fetch health data:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to fetch health data";
      setError(errorMsg);
      showToast({
        title: "Health Data Error",
        description: errorMsg,
        variant: "error",
      });
      setHealthData([]);
      setIsGoogleHealthConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]); // Removed getAuthHeaders dependency

  // Throttled fetch logic remains the same
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

  // Initial fetch logic remains the same
  useEffect(() => {
    if (session) {
      fetchHealthDataIfNeeded();
    } else {
      setHealthData([]);
      setIsGoogleHealthConnected(false);
      setLastFetchTime(null);
    }
  }, [session, fetchHealthDataIfNeeded]); // Added fetchHealthDataIfNeeded dependency

  // Visibility change logic remains the same
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
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true); // Consider specific loading state
    setError(null);
    try {
      // Use authenticatedFetch for POST
      await authenticatedFetch<void>(
        "/api/health/manual",
        "POST",
        session,
        entry
      );
      // Refetch after successful add
      await fetchHealthData();
      showToast({ title: "Health Entry Added", variant: "success" });
    } catch (e) {
      console.error("Failed to add manual health entry:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to add health entry";
      setError(errorMsg);
      showToast({
        title: "Add Health Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // connectGoogleHealth remains the same as it's just a redirect
  const connectGoogleHealth = () => {
    window.location.href = "/api/auth/google-health/start";
  };

  const disconnectGoogleHealth = async () => {
    if (!session) {
      setError("You must be logged in.");
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Use authenticatedFetch for POST, sending provider in body
      await authenticatedFetch<void>(
        "/api/auth/google/disconnect",
        "POST",
        session,
        { provider: "google_health" } // Specify provider
      );
      console.log("Successfully disconnected Google Health via API.");
      // Refetch to update status
      await fetchHealthData();
      showToast({ title: "Google Health Disconnected", variant: "success" });
    } catch (e) {
      console.error("Failed to disconnect Google Health:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to disconnect Google Health";
      setError(errorMsg);
      showToast({
        title: "Disconnect Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch even on error to update state
      await fetchHealthData();
    } finally {
      // isLoading will be set by fetchHealthData
    }
  };

  const deleteManualHealthEntry = async (entryId: string) => {
    if (!session) {
      setError("You must be logged in.");
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
        `/api/health/manual/${entryId}`,
        "DELETE",
        session
      );
      // Refetch after successful delete
      await fetchHealthData();
      showToast({ title: "Health Entry Deleted", variant: "success" });
    } catch (e) {
      console.error("Failed to delete manual health entry:", e);
      const errorMsg =
        e instanceof Error ? e.message : "Failed to delete health entry";
      setError(errorMsg);
      showToast({
        title: "Delete Health Error",
        description: errorMsg,
        variant: "error",
      });
      // Refetch even on error
      await fetchHealthData();
    } finally {
      // isLoading will be set by fetchHealthData
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
    lastFetchTime,
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
