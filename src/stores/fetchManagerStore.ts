import { create } from 'zustand';
import { useAuthStore } from '@/stores/authStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { useTodosStore } from '@/stores/todosStore';
import { useNotificationStore } from '@/stores/notificationStore';
import { useToastStore } from '@/stores/toastStore';
import dayjs from 'dayjs';

import { useFinanceStore } from '@/stores/financeStore'; // Import FinanceStore
import { useHabitsStore } from '@/stores/habitsStore'; // Import HabitsStore
import { useHealthStore } from '@/stores/healthStore'; // Import HealthStore
// TODO: Re-integrate when QuestsContext is migrated to Zustand
// QuestsContext import removed


const FETCH_COOLDOWN_SECONDS = 180; // 3 minutes

interface FetchManagerState {
  lastFetchTimestamp: number | null;
  isFetching: boolean;
  triggerGlobalFetch: (force?: boolean) => Promise<void>;
  _setupEventListeners: () => () => void; // For event listeners
}

export const useFetchManagerStore = create<FetchManagerState>((set, get) => ({
  lastFetchTimestamp: null,
  isFetching: false,

  triggerGlobalFetch: async (force = false) => {
    if (get().isFetching) {
      console.log("[FetchManagerStore] Fetch already in progress, skipping.");
      return;
    }

    const now = Date.now();
    const timeSinceLastFetch = get().lastFetchTimestamp
      ? (now - get().lastFetchTimestamp!) / 1000
      : Infinity;

    if (!force && timeSinceLastFetch < FETCH_COOLDOWN_SECONDS) {
      console.log(
        `[FetchManagerStore] Cooldown active (${Math.round(
          FETCH_COOLDOWN_SECONDS - timeSinceLastFetch
        )}s remaining), skipping fetch.`
      );
      return;
    }

    console.log(
      `[FetchManagerStore] Triggering global fetch ${
        force ? "(forced)" : "(cooldown passed)"
      }...`
    );
    set({ isFetching: true });

    try {
      // Fetch actions from migrated Zustand stores
      const authActions = useAuthStore.getState();
      const calendarActions = useCalendarStore.getState();
      const todosActions = useTodosStore.getState();
      const notificationActions = useNotificationStore.getState();
      const financeActions = useFinanceStore.getState();
      const habitsActions = useHabitsStore.getState();
      const healthActions = useHealthStore.getState();

      // TODO: Re-integrate when QuestsContext is migrated to Zustand
      // Quests-related fetch function call removed


      // Calculate date range for habit entries fetch
      const today = dayjs().format("YYYY-MM-DD");
      const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");

      await Promise.allSettled([
        authActions.fetchUserProgress(useAuthStore.getState().session), // Pass session if required by action
        calendarActions.fetchEvents(),
        todosActions.fetchTodos(),
        notificationActions.fetchNotifications(),
        financeActions.fetchSettings(),
        financeActions.fetchTodaysEntries(),
        habitsActions.fetchHabits(),
        habitsActions.fetchHabitEntries(weekAgo, today),
        healthActions.fetchHealthData(),
        // TODO: Re-integrate when QuestsContext is migrated to Zustand
        // Quests-related fetch call removed
      ]);

      const fetchEndTime = Date.now();
      set({ lastFetchTimestamp: fetchEndTime });
      console.log(
        `[FetchManagerStore] Global fetch completed at ${new Date(
          fetchEndTime
        ).toLocaleTimeString()}.`
      );
    } catch (error) {
      console.error(
        "[FetchManagerStore] Unexpected error during global fetch:",
        error
      );
      useToastStore.getState().showToast({
        title: "Global Fetch Error",
        description: "An unexpected error occurred while syncing data.",
        variant: "error",
      });
    } finally {
      set({ isFetching: false });
    }
  },

  _setupEventListeners: () => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[FetchManagerStore] App regained focus.');
        get().triggerGlobalFetch();
      }
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'REFETCH_DATA') {
        console.log('[FetchManagerStore] Received REFETCH_DATA message from Service Worker. Triggering forced fetch.');
        get().triggerGlobalFetch(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleVisibilityChange); // Fallback

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Return cleanup function
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleVisibilityChange);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
      console.log("[FetchManagerStore] Event listeners cleaned up.");
    };
  },
}));

// Setup event listeners when the store is initialized
const cleanupEventListeners = useFetchManagerStore.getState()._setupEventListeners();

// Optional: Initial fetch on app load
// Consider if this is needed, or if individual stores handle their own initial load sufficiently.
// If individual stores already fetch on auth change, this might be redundant.
// However, if there's data needed even before auth (or for non-auth stores not yet refactored),
// this could be a place for it.
// For now, let's assume individual stores handle their initial load based on auth.
// console.log("[FetchManagerStore] Initializing. Consider if an initial global fetch is needed.");

// The cleanupEventListeners function can be called if the application ever has a top-level unmount/destroy phase,
// though this is not common for the root of a React application.
// For instance, if this were part of a micro-frontend that could be unmounted.
// For a standard SPA, these listeners will persist for the app's lifetime.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cleanupEventListeners();
    console.log("[FetchManagerStore] Cleaned up event listeners on HMR dispose.");
  });
}
