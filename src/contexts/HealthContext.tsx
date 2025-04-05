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
import { startOfWeek, addWeeks, subWeeks } from "date-fns"; // Import date-fns functions

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
  fetchHealthDataIfNeeded: () => void;
  lastFetchTime: Date | null;
  // Add week navigation state and functions for steps display
  currentStepsWeekStart: Date;
  goToPreviousStepsWeek: () => void;
  goToNextStepsWeek: () => void;
  goToCurrentStepsWeek: () => void;
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
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  // Initialize week start state
  const [currentStepsWeekStart, setCurrentStepsWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday as start
  );
  const { session } = useAuth();
  const { showToast } = useToast();

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const fetchHealthData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await authenticatedFetch<{
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
      }>("/api/health", "GET", session);

      setHealthData(data.healthEntries || []);
      setIsGoogleHealthConnected(data.isGoogleHealthConnected);
      setLastFetchTime(new Date());
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
  }, [session, showToast]);

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
  }, [session, fetchHealthDataIfNeeded]);

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
    setIsLoading(true);
    setError(null);
    try {
      await authenticatedFetch<void>(
        "/api/health/manual",
        "POST",
        session,
        entry
      );
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
      await authenticatedFetch<void>(
        "/api/auth/google/disconnect",
        "POST",
        session,
        { provider: "google_health" }
      );
      console.log("Successfully disconnected Google Health via API.");
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
    setIsLoading(true);
    setError(null);
    try {
      await authenticatedFetch<void>(
        `/api/health/manual/${entryId}`,
        "DELETE",
        session
      );
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
      await fetchHealthData();
    } finally {
      // isLoading will be set by fetchHealthData
    }
  };

  // --- Week Navigation Functions ---
  const goToPreviousStepsWeek = () => {
    setCurrentStepsWeekStart((prevDate) => subWeeks(prevDate, 1));
  };

  const goToNextStepsWeek = () => {
    setCurrentStepsWeekStart((prevDate) => addWeeks(prevDate, 1));
  };

  const goToCurrentStepsWeek = () => {
    setCurrentStepsWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
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
    // Expose week navigation
    currentStepsWeekStart,
    goToPreviousStepsWeek,
    goToNextStepsWeek,
    goToCurrentStepsWeek,
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
