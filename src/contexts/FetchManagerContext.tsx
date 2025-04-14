import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import { useCalendar } from "./CalendarContext";
import { useFinance } from "./FinanceContext";
import { useHabits } from "./HabitsContext";
import { useHealth } from "./HealthContext";
import { useQuests } from "./QuestsContext";
import { useTodos } from "./TodosContext";
import { useNotification } from "./NotificationContext"; // Import useNotification
import { useToast } from "./ToastContext";
import dayjs from "dayjs"; // Import dayjs for date calculations

const FETCH_COOLDOWN_SECONDS = 180;

interface FetchManagerContextType {
  lastFetchTimestamp: number | null;
  isFetching: boolean;
  triggerGlobalFetch: (force?: boolean) => Promise<void>;
}

const FetchManagerContext = createContext<FetchManagerContextType | undefined>(
  undefined
);

export const FetchManagerProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [lastFetchTimestamp, setLastFetchTimestamp] = useState<number | null>(
    null
  );
  const [isFetching, setIsFetching] = useState(false);
  const isFetchingRef = useRef(isFetching); // Ref to avoid stale closure in event listener
  const lastFetchTimestampRef = useRef(lastFetchTimestamp); // Ref for event listener

  const { showToast } = useToast();

  // --- Hooks for accessing context fetch functions ---
  // We need these to call the individual fetch functions
  const { fetchUserProgress } = useAuth();
  const { fetchEvents: fetchCalendarEvents } = useCalendar(); // Corrected name
  const {
    fetchSettings: fetchFinanceSettings,
    fetchTodaysEntries: fetchFinanceTodaysEntries,
  } = useFinance(); // Corrected names
  const { fetchHabits, fetchHabitEntries } = useHabits(); // Import correct functions
  const { fetchHealthData } = useHealth();
  const { fetchQuests: fetchQuestsData } = useQuests(); // Corrected name
  const { fetchTodos } = useTodos();
  const { fetchNotifications } = useNotification(); // Get notification fetch function
  // --- End Hooks ---

  // Update refs when state changes
  useEffect(() => {
    isFetchingRef.current = isFetching;
  }, [isFetching]);

  useEffect(() => {
    lastFetchTimestampRef.current = lastFetchTimestamp;
  }, [lastFetchTimestamp]);

  const triggerGlobalFetch = useCallback(
    async (force: boolean = false) => {
      if (isFetchingRef.current) {
        console.log("[FetchManager] Fetch already in progress, skipping.");
        return;
      }

      const now = Date.now();
      const timeSinceLastFetch = lastFetchTimestampRef.current
        ? (now - lastFetchTimestampRef.current) / 1000
        : Infinity;

      if (!force && timeSinceLastFetch < FETCH_COOLDOWN_SECONDS) {
        console.log(
          `[FetchManager] Cooldown active (${Math.round(
            FETCH_COOLDOWN_SECONDS - timeSinceLastFetch
          )}s remaining), skipping fetch.`
        );
        return;
      }

      console.log(
        `[FetchManager] Triggering global fetch ${
          force ? "(forced)" : "(cooldown passed)"
        }...`
      );
      setIsFetching(true);

      try {
        // Call all individual fetch functions concurrently
        // TODO: Add error handling for individual fetches?
        // Maybe collect results/errors? For now, just log errors in individual contexts.
        // Calculate date range for habit entries fetch
        const today = dayjs().format("YYYY-MM-DD");
        const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");

        await Promise.allSettled([
          fetchUserProgress(),
          fetchCalendarEvents(),
          fetchFinanceSettings(), // Call specific finance fetches
          fetchFinanceTodaysEntries(), // Call specific finance fetches
          fetchHabits(), // Call fetchHabits directly
          fetchHabitEntries(weekAgo, today), // Call fetchHabitEntries directly
          fetchHealthData(),
          fetchQuestsData(),
          fetchTodos(),
          fetchNotifications(), // Add notification fetch
        ]);

        const fetchEndTime = Date.now();
        setLastFetchTimestamp(fetchEndTime);
        console.log(
          `[FetchManager] Global fetch completed at ${new Date(
            fetchEndTime
          ).toLocaleTimeString()}.`
        );
        // Optional: Show success toast? Might be too noisy.
        // showToast({ title: "Data Synced", description: `Last sync: ${new Date(fetchEndTime).toLocaleTimeString()}`, variant: "success" });
      } catch (error) {
        // This catch block might not be reached if Promise.allSettled is used,
        // unless there's an error *outside* the individual fetches.
        console.error(
          "[FetchManager] Unexpected error during global fetch:",
          error
        );
        showToast({
          title: "Global Fetch Error",
          description: "An unexpected error occurred while syncing data.",
          variant: "error",
        });
      } finally {
        setIsFetching(false);
      }
    },
    [
      fetchUserProgress,
      fetchCalendarEvents,
      fetchFinanceSettings, // Updated dependency
      fetchFinanceTodaysEntries, // Updated dependency
      fetchHabits, // Updated dependency
      fetchHabitEntries, // Updated dependency
      fetchHealthData,
      fetchQuestsData,
      fetchTodos,
      fetchNotifications, // Add to dependencies
      showToast,
    ] // Add all fetch functions as dependencies
  );

  // Effect for handling window focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("[FetchManager] App regained focus.");
        // Add diagnostic logging
        console.log(
          `[FetchManager] Checking cooldown: isFetching=${
            isFetchingRef.current
          }, lastFetch=${
            lastFetchTimestampRef.current
              ? new Date(lastFetchTimestampRef.current).toLocaleTimeString()
              : "null"
          }`
        );
        triggerGlobalFetch(); // Trigger fetch on focus (respects cooldown)
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange); // Fallback for some browsers/cases

    // Initial fetch on load? Consider if needed. Maybe call triggerGlobalFetch() here once.
    // triggerGlobalFetch(); // Uncomment if initial fetch on app load is desired

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [triggerGlobalFetch]); // triggerGlobalFetch has its own dependencies

  const value = { lastFetchTimestamp, isFetching, triggerGlobalFetch };

  return (
    <FetchManagerContext.Provider value={value}>
      {children}
    </FetchManagerContext.Provider>
  );
};

export const useFetchManager = (): FetchManagerContextType => {
  const context = useContext(FetchManagerContext);
  if (!context) {
    throw new Error(
      "useFetchManager must be used within a FetchManagerProvider"
    );
  }
  return context;
};
