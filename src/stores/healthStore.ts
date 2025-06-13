import { create } from 'zustand';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { authenticatedFetch } from '@/lib/apiClient';
import { startOfWeek, addWeeks, subWeeks } from "date-fns";

// --- Types ---
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

export interface HealthSettings {
  daily_steps_goal: number;
  weight_goal: number | null;
}

interface HealthState {
  healthData: HealthEntry[];
  isLoading: boolean;
  error: string | null;
  isGoogleHealthConnected: boolean;
  currentStepsWeekStart: Date;
  healthSettings: HealthSettings | null;

  fetchHealthData: () => Promise<void>;
  addManualHealthEntry: (entry: { entry_date: string; type: string; value: number }) => Promise<void>;
  deleteManualHealthEntry: (entryId: string) => Promise<void>;
  connectGoogleHealth: () => void;
  disconnectGoogleHealth: () => Promise<void>;
  goToPreviousStepsWeek: () => void;
  goToNextStepsWeek: () => void;
  goToCurrentStepsWeek: () => void;
  updateHealthSettings: (settings: HealthSettings) => Promise<void>;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  healthData: [],
  isLoading: false,
  error: null,
  isGoogleHealthConnected: false,
  currentStepsWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  healthSettings: null,

  fetchHealthData: async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
        set({ isLoading: false, healthData: [], isGoogleHealthConnected: false, healthSettings: null });
        return;
    }
    set({ isLoading: true, error: null });
    try {
      const data = await authenticatedFetch<{
        healthEntries: HealthEntry[];
        isGoogleHealthConnected: boolean;
        healthSettings: HealthSettings;
      }>("/api/health", "GET", session);

      set({
        healthData: data.healthEntries || [],
        isGoogleHealthConnected: data.isGoogleHealthConnected,
        healthSettings: data.healthSettings || { daily_steps_goal: 10000, weight_goal: null },
        isLoading: false,
      });
    } catch (e: any) {
      console.error("[HealthStore] Failed to fetch health data:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch health data";
      set({ isLoading: false, error: errorMsg, healthData: [], isGoogleHealthConnected: false, healthSettings: null });
      useToastStore.getState().showToast({
        title: "Health Data Error",
        description: errorMsg,
        variant: "error",
      });
    }
  },

  addManualHealthEntry: async (entry) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({ title: "Auth Error", description: "Please log in.", variant: "error" });
      return;
    }
    set({ isLoading: true, error: null }); // Consider specific loading state
    try {
      await authenticatedFetch<void>("/api/health/manual", "POST", session, entry);
      await get().fetchHealthData(); // Refetch all data
      useToastStore.getState().showToast({ title: "Health Entry Added", variant: "success" });
    } catch (e: any) {
      console.error("[HealthStore] Failed to add manual health entry:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to add health entry";
      set({ isLoading: false, error: errorMsg }); // isLoading false as fetchHealthData not called on error here
      useToastStore.getState().showToast({ title: "Add Health Error", description: errorMsg, variant: "error" });
    }
    // isLoading is reset by fetchHealthData on success
  },

  deleteManualHealthEntry: async (entryId) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({ title: "Auth Error", description: "Please log in.", variant: "error" });
      return;
    }
    set({ isLoading: true, error: null }); // Consider specific loading state
    try {
      await authenticatedFetch<void>(`/api/health/manual/${entryId}`, "DELETE", session);
      await get().fetchHealthData(); // Refetch all data
      useToastStore.getState().showToast({ title: "Health Entry Deleted", variant: "success" });
    } catch (e: any) {
      console.error("[HealthStore] Failed to delete manual health entry:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to delete health entry";
      set({ isLoading: false, error: errorMsg });
      useToastStore.getState().showToast({ title: "Delete Health Error", description: errorMsg, variant: "error" });
      await get().fetchHealthData(); // Refetch even on error to ensure consistency
    }
  },

  connectGoogleHealth: () => {
    window.location.href = "/api/auth/google-health/start";
  },

  disconnectGoogleHealth: async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({ title: "Auth Error", description: "Please log in.", variant: "error" });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await authenticatedFetch<void>("/api/auth/google/disconnect", "POST", session, { provider: "google_health" });
      await get().fetchHealthData(); // Refetch to update connection status and data
      useToastStore.getState().showToast({ title: "Google Health Disconnected", variant: "success" });
    } catch (e: any) {
      console.error("[HealthStore] Failed to disconnect Google Health:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to disconnect Google Health";
      set({ isLoading: false, error: errorMsg });
      useToastStore.getState().showToast({ title: "Disconnect Error", description: errorMsg, variant: "error" });
      await get().fetchHealthData(); // Refetch even on error
    }
  },

  goToPreviousStepsWeek: () => {
    set(state => ({ currentStepsWeekStart: subWeeks(state.currentStepsWeekStart, 1) }));
  },
  goToNextStepsWeek: () => {
    set(state => ({ currentStepsWeekStart: addWeeks(state.currentStepsWeekStart, 1) }));
  },
  goToCurrentStepsWeek: () => {
    set({ currentStepsWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }) });
  },

  updateHealthSettings: async (settingsToUpdate) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({ title: "Auth Error", description: "Please log in.", variant: "error" });
      return;
    }
    // Basic frontend validation
    if (settingsToUpdate.daily_steps_goal < 0 || !Number.isInteger(settingsToUpdate.daily_steps_goal)) {
      useToastStore.getState().showToast({ title: "Validation Error", description: "Steps goal must be a non-negative integer.", variant: "error" });
      return;
    }
    if (settingsToUpdate.weight_goal !== null && (typeof settingsToUpdate.weight_goal !== "number" || settingsToUpdate.weight_goal <= 0)) {
      useToastStore.getState().showToast({ title: "Validation Error", description: "Weight goal must be null or a positive number.", variant: "error" });
      return;
    }

    set({ isLoading: true, error: null }); // Consider specific settings loading state
    try {
      await authenticatedFetch<void>("/api/health/settings", "PUT", session, settingsToUpdate);
      await get().fetchHealthData(); // Refetch to get updated settings and data
      useToastStore.getState().showToast({ title: "Health Settings Updated", variant: "success" });
    } catch (e: any) {
      console.error("[HealthStore] Failed to update health settings:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to update settings";
      set({ isLoading: false, error: errorMsg });
      useToastStore.getState().showToast({ title: "Update Settings Error", description: errorMsg, variant: "error" });
      // No automatic refetch on error, user might want to retry with current form data
    }
  },
}));

// --- Auth Subscription ---
let currentAuthSessionHealthToken = useAuthStore.getState().session?.access_token;
let initialHealthFetchCompletedForSession = false;

useAuthStore.subscribe(
  (newSession) => {
    const { fetchHealthData } = useHealthStore.getState();
    const newAuthSessionHealthToken = newSession?.access_token;

    if (newAuthSessionHealthToken && !initialHealthFetchCompletedForSession) {
      console.log("[HealthStore] Auth session detected, fetching initial health data...");
      fetchHealthData();
      initialHealthFetchCompletedForSession = true;
    } else if (!newAuthSessionHealthToken) { // User signed out
      console.log("[HealthStore] Auth session removed, clearing health data...");
      useHealthStore.setState({
        healthData: [], isLoading: false, error: null, isGoogleHealthConnected: false,
        healthSettings: null, currentStepsWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 })
      });
      initialHealthFetchCompletedForSession = false;
    } else if (newAuthSessionHealthToken && newAuthSessionHealthToken !== currentAuthSessionHealthToken) {
        console.log("[HealthStore] Auth session refreshed, refetching health data...");
        fetchHealthData();
    }
    currentAuthSessionHealthToken = newAuthSessionHealthToken;
  },
  (state) => state.session
);

if (currentAuthSessionHealthToken && !initialHealthFetchCompletedForSession) {
  console.log("[HealthStore] Initial auth session present on load, fetching health data...");
  useHealthStore.getState().fetchHealthData();
  initialHealthFetchCompletedForSession = true;
}
