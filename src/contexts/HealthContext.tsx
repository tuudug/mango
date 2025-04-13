import { authenticatedFetch } from "@/lib/apiClient"; // Import the new utility and error class
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef, // Import useRef
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
// Define the structure for health settings
export interface HealthSettings {
  daily_steps_goal: number;
  weight_goal: number | null; // Add weight_goal
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
  // Removed fetchHealthDataIfNeeded and lastFetchTime
  // Add week navigation state and functions for steps display
  currentStepsWeekStart: Date;
  goToPreviousStepsWeek: () => void;
  goToNextStepsWeek: () => void;
  goToCurrentStepsWeek: () => void;
  // Add settings state and update function
  healthSettings: HealthSettings | null;
  updateHealthSettings: (settings: HealthSettings) => Promise<void>;
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
  // Removed lastFetchTime state
  // Initialize week start state
  const [currentStepsWeekStart, setCurrentStepsWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday as start
  );
  // Add state for health settings
  const [healthSettings, setHealthSettings] = useState<HealthSettings | null>(
    null // Initial state remains null until fetched
  );
  const { session } = useAuth();
  const { showToast } = useToast();
  const initialFetchDoneRef = useRef(false); // Ref to track initial fetch

  // Removed REFRESH_INTERVAL_MS constant

  const fetchHealthData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      // Expect updated HealthSettings structure from API
      const data = await authenticatedFetch<{
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
        healthSettings: HealthSettings;
      }>("/api/health", "GET", session);

      setHealthData(data.healthEntries || []);
      setIsGoogleHealthConnected(data.isGoogleHealthConnected);
      // Set settings, provide defaults if missing from response (though API should provide them)
      setHealthSettings(
        data.healthSettings || {
          daily_steps_goal: 10000,
          weight_goal: null,
        }
      );
      // Removed setLastFetchTime
      console.log(
        "[HealthContext] Google Health Connected Status (from backend):", // Prefixed log
        data.isGoogleHealthConnected
      );
      console.log(
        "[HealthContext] Fetched Health Settings:",
        data.healthSettings
      ); // Prefixed log
    } catch (e) {
      console.error("[HealthContext] Failed to fetch health data:", e); // Prefixed log
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
      setHealthSettings(null); // Clear settings on error
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  // Removed fetchHealthDataIfNeeded function

  // Effect to fetch data when session changes - only fetch once
  useEffect(() => {
    if (session && !initialFetchDoneRef.current) {
      console.log(
        "[HealthContext] Session detected for the first time, fetching initial data..."
      ); // Prefixed log
      initialFetchDoneRef.current = true; // Mark initial fetch as done
      fetchHealthData();
    } else if (!session) {
      // Clear data and reset flag on logout
      setHealthData([]);
      setIsGoogleHealthConnected(false);
      // Removed setLastFetchTime
      setHealthSettings(null); // Clear settings on logout
      initialFetchDoneRef.current = false; // Reset flag
    }
  }, [session, fetchHealthData]); // Depend on session and fetchHealthData

  // Removed visibility change useEffect hook

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
      console.error("[HealthContext] Failed to add manual health entry:", e); // Prefixed log
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
      console.error("[HealthContext] Failed to disconnect Google Health:", e); // Prefixed log
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
      console.error("[HealthContext] Failed to delete manual health entry:", e); // Prefixed log
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

  // --- Settings Update Function ---
  // Accepts the full HealthSettings object
  const updateHealthSettings = async (settingsToUpdate: HealthSettings) => {
    if (!session) {
      setError("You must be logged in to update settings.");
      showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    // Basic validation on frontend too
    // Validate steps goal
    if (
      settingsToUpdate.daily_steps_goal < 0 ||
      !Number.isInteger(settingsToUpdate.daily_steps_goal)
    ) {
      setError("Invalid goal: Steps goal must be a non-negative integer.");
      showToast({
        title: "Validation Error",
        description: "Steps goal must be a non-negative integer.",
        variant: "error",
      });
      return;
    }
    // Validate weight goal
    if (
      settingsToUpdate.weight_goal !== null &&
      (typeof settingsToUpdate.weight_goal !== "number" ||
        settingsToUpdate.weight_goal <= 0)
    ) {
      setError("Invalid goal: Weight goal must be null or a positive number.");
      showToast({
        title: "Validation Error",
        description: "Steps goal must be a non-negative integer.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      await authenticatedFetch<void>(
        "/api/health/settings",
        "PUT",
        session,
        settingsToUpdate
      );
      // Re-fetch all data to ensure consistency after update
      await fetchHealthData();
      showToast({ title: "Health Settings Updated", variant: "success" });
    } catch (e) {
      console.error("[HealthContext] Failed to update health settings:", e); // Prefixed log
      const errorMsg =
        e instanceof Error ? e.message : "Failed to update settings";
      setError(errorMsg);
      showToast({
        title: "Update Settings Error",
        description: errorMsg,
        variant: "error",
      });
      // Optionally re-fetch even on error to revert optimistic UI?
      // await fetchHealthData();
    } finally {
      // isLoading will be set by the subsequent fetchHealthData call
      // setIsLoading(false); // Removed as fetchHealthData handles it
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
    // Removed fetchHealthDataIfNeeded and lastFetchTime
    // Expose week navigation
    currentStepsWeekStart,
    goToPreviousStepsWeek,
    goToNextStepsWeek,
    goToCurrentStepsWeek,
    // Expose settings and update function
    healthSettings,
    updateHealthSettings,
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
