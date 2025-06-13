import { create } from 'zustand';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { authenticatedFetch } from '@/lib/apiClient';
import { CalendarItem } from '@/types/datasources';

export interface CalendarState {
  events: CalendarItem[];
  isLoading: boolean;
  error: string | null;
  isGoogleConnected: boolean;
  fetchEvents: () => Promise<void>;
  addManualEvent: (eventData: { title: string; date: string }) => Promise<void>;
  deleteManualEvent: (eventId: string) => Promise<void>;
  connectGoogleCalendar: () => void;
  disconnectGoogleCalendar: () => Promise<void>;
  confirmGoogleConnection: () => void;
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  isLoading: false,
  error: null,
  isGoogleConnected: false,

  fetchEvents: async () => {
    const session = useAuthStore.getState().session;
    if (!session) return;

    set({ isLoading: true, error: null });
    try {
      const data = await authenticatedFetch<{
        events: CalendarItem[];
        isGoogleConnected: boolean;
      }>("/api/calendar", "GET", session);

      set({
        events: data.events || [],
        isGoogleConnected: data.isGoogleConnected,
        isLoading: false,
      });
      console.log("[CalendarStore] Google Connected Status (from backend):", data.isGoogleConnected);
    } catch (e: any) {
      console.error("[CalendarStore] Failed to fetch calendar events:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to fetch calendar data";
      set({ isLoading: false, error: errorMsg, events: [], isGoogleConnected: false });
      useToastStore.getState().showToast({
        title: "Calendar Error",
        description: errorMsg,
        variant: "error",
      });
    }
  },

  addManualEvent: async (eventData: { title: string; date: string }) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ error: "You must be logged in to add events." });
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    set({ isLoading: true, error: null }); // Consider specific loading state for add
    try {
      await authenticatedFetch<void>("/api/calendar/manual", "POST", session, eventData);
      await get().fetchEvents(); // Re-fetch events
      useToastStore.getState().showToast({ title: "Event Added", variant: "success" });
    } catch (e: any) {
      console.error("[CalendarStore] Failed to add manual event:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to add event";
      set({ isLoading: false, error: errorMsg });
      useToastStore.getState().showToast({
        title: "Add Event Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      // isLoading will be reset by fetchEvents or error case
    }
  },

  deleteManualEvent: async (eventId: string) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ error: "You must be logged in to delete events." });
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    set({ isLoading: true, error: null }); // Consider specific loading state for delete
    try {
      await authenticatedFetch<void>(`/api/calendar/manual/${eventId}`, "DELETE", session);
      await get().fetchEvents(); // Re-fetch events
      useToastStore.getState().showToast({ title: "Event Deleted", variant: "success" });
    } catch (e: any) {
      console.error("[CalendarStore] Failed to delete manual event:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to delete event";
      set({ error: errorMsg }); // isLoading will be reset by fetchEvents
      useToastStore.getState().showToast({
        title: "Delete Event Error",
        description: errorMsg,
        variant: "error",
      });
      await get().fetchEvents(); // Also refetch on error to ensure consistency
    } finally {
        // isLoading will be reset by fetchEvents or error case
    }
  },

  connectGoogleCalendar: () => {
    window.location.href = "/api/auth/google/start";
  },

  disconnectGoogleCalendar: async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ error: "You must be logged in to disconnect." });
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return;
    }
    set({ isLoading: true, error: null });
    try {
      await authenticatedFetch<void>("/api/auth/google/disconnect", "POST", session);
      await get().fetchEvents(); // This will update connection status and events
      useToastStore.getState().showToast({ title: "Google Calendar Disconnected", variant: "success" });
    } catch (e: any) {
      console.error("[CalendarStore] Failed to disconnect Google Calendar:", e);
      const errorMsg = e instanceof Error ? e.message : "Failed to disconnect Google Calendar";
      set({ error: errorMsg }); // isLoading will be reset by fetchEvents
      useToastStore.getState().showToast({
        title: "Disconnect Error",
        description: errorMsg,
        variant: "error",
      });
      await get().fetchEvents(); // Also refetch on error
    }
  },

  confirmGoogleConnection: () => {
    console.log("[CalendarStore] Confirming Google Connection - setting state and fetching.");
    set({ isGoogleConnected: true, isLoading: true }); // Optimistically set and indicate loading for fetch
    get().fetchEvents();
  },
}));

// --- Auth Subscription ---
let currentAuthSessionCalendarToken = useAuthStore.getState().session?.access_token;

useAuthStore.subscribe(
  (newSession) => {
    const { fetchEvents } = useCalendarStore.getState();
    const newAuthSessionCalendarToken = newSession?.access_token;

    if (newAuthSessionCalendarToken && !currentAuthSessionCalendarToken) { // User signed in
      console.log("[CalendarStore] Auth session detected (sign in), fetching initial calendar events...");
      fetchEvents();
    } else if (!newAuthSessionCalendarToken && currentAuthSessionCalendarToken) { // User signed out
      console.log("[CalendarStore] Auth session removed (sign out), clearing calendar events...");
      useCalendarStore.setState({ events: [], isLoading: false, error: null, isGoogleConnected: false });
    } else if (newAuthSessionCalendarToken && newAuthSessionCalendarToken !== currentAuthSessionCalendarToken) { // Session refreshed
        console.log("[CalendarStore] Auth session refreshed, fetching calendar events...");
        fetchEvents();
    }
    currentAuthSessionCalendarToken = newAuthSessionCalendarToken;
  },
  (state) => state.session
);

// Initial fetch if session already exists on load
if (currentAuthSessionCalendarToken) {
  console.log("[CalendarStore] Initial auth session present on load, fetching calendar events...");
  useCalendarStore.getState().fetchEvents();
}
