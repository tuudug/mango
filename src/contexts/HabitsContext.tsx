import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  useEffect,
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { authenticatedFetch, ApiError } from "@/lib/apiClient";
import dayjs from "dayjs"; // Needed for date formatting/comparison

// --- Types ---
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  type: "positive" | "negative";
  reminder_time: string | null;
  log_type: "once_daily" | "multiple_daily";
  created_at: string;
  updated_at: string;
}

export interface HabitEntry {
  id: string;
  user_id: string;
  habit_id: string;
  entry_date: string; // YYYY-MM-DD
  completed: boolean;
  created_at: string;
}

interface HabitsContextType {
  habits: Habit[];
  habitEntries: HabitEntry[]; // Store entries fetched for reports/checks
  isLoadingHabits: boolean;
  isLoadingEntries: boolean;
  error: string | null;
  fetchHabits: () => Promise<void>;
  addHabit: (
    newHabitData: Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<Habit | null>;
  updateHabit: (
    habitId: string,
    updateData: Partial<
      Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
    >
  ) => Promise<Habit | null>;
  deleteHabit: (habitId: string) => Promise<boolean>;
  fetchHabitEntries: (
    startDate: string,
    endDate: string,
    habitId?: string
  ) => Promise<HabitEntry[]>; // Returns entries, doesn't store all globally
  recordHabitEntry: (
    habitId: string,
    entryDate: string
  ) => Promise<HabitEntry | null>;
  deleteHabitEntry: (entryId: string) => Promise<boolean>;
  getEntriesForDate: (date: string) => HabitEntry[]; // Helper to get entries for a specific date
  hasEntryForDate: (habitId: string, date: string) => boolean; // Helper to check if entry exists
  fetchInitialDataIfNeeded: () => Promise<void>; // Expose the interval-checking fetch function
}

const HabitsContext = createContext<HabitsContextType | undefined>(undefined);

export const HabitsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]); // Store recently fetched entries
  const [isLoadingHabits, setIsLoadingHabits] = useState(false);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false); // Separate loading for entries
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null); // Track last fetch time
  const { session } = useAuth();
  const { showToast } = useToast();

  const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  const handleError = useCallback(
    (operation: string, error: unknown) => {
      console.error(`HabitsContext Error (${operation}):`, error);
      const errorMsg =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
          ? error.message
          : `Unknown error during ${operation}`;
      setError(errorMsg);
      showToast({
        title: `Habit Error (${operation})`,
        description: errorMsg,
        variant: "destructive", // Use destructive variant for errors
      });
    },
    [showToast]
  );

  // --- Habit Definitions ---

  const fetchHabits = useCallback(async () => {
    if (!session) return;
    setIsLoadingHabits(true);
    setError(null);
    try {
      const data = await authenticatedFetch<Habit[]>(
        "/api/habits",
        "GET",
        session
      );
      setHabits(data || []);
      // Timestamp will be set after both fetches complete in fetchInitialDataIfNeeded
    } catch (e) {
      handleError("fetchHabits", e);
      setHabits([]);
    } finally {
      setIsLoadingHabits(false); // Ensure loading state is always reset
    }
  }, [session, handleError]);

  const addHabit = useCallback(
    async (
      newHabitData: Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
    ): Promise<Habit | null> => {
      if (!session) return null;
      // Consider adding loading state specifically for add/update/delete
      try {
        const newHabit = await authenticatedFetch<Habit>(
          "/api/habits",
          "POST",
          session,
          newHabitData
        );
        setHabits((prev) => [...prev, newHabit]);
        showToast({
          title: "Habit Added",
          description: `"${newHabit.name}" created.`,
        });
        return newHabit;
      } catch (e) {
        handleError("addHabit", e);
        return null;
      }
    },
    [session, handleError, showToast]
  );

  const updateHabit = useCallback(
    async (
      habitId: string,
      updateData: Partial<
        Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
      >
    ): Promise<Habit | null> => {
      if (!session) return null;
      try {
        const updatedHabit = await authenticatedFetch<Habit>(
          `/api/habits/${habitId}`,
          "PUT",
          session,
          updateData
        );
        setHabits((prev) =>
          prev.map((h) => (h.id === habitId ? updatedHabit : h))
        );
        showToast({
          title: "Habit Updated",
          description: `"${updatedHabit.name}" saved.`,
        });
        return updatedHabit;
      } catch (e) {
        handleError("updateHabit", e);
        return null;
      }
    },
    [session, handleError, showToast]
  );

  const deleteHabit = useCallback(
    async (habitId: string): Promise<boolean> => {
      if (!session) return false;
      const habitToDelete = habits.find((h) => h.id === habitId);
      try {
        await authenticatedFetch<void>(
          `/api/habits/${habitId}`,
          "DELETE",
          session
        );
        setHabits((prev) => prev.filter((h) => h.id !== habitId));
        // Also remove associated entries from local state if present
        setHabitEntries((prev) => prev.filter((e) => e.habit_id !== habitId));
        showToast({
          title: "Habit Deleted",
          description: `"${habitToDelete?.name || habitId}" removed.`,
        });
        return true;
      } catch (e) {
        handleError("deleteHabit", e);
        return false;
      }
    },
    [session, handleError, showToast, habits] // Added habits dependency
  );

  // --- Habit Entries ---

  // Fetches entries but primarily returns them, optionally updating local state
  const fetchHabitEntries = useCallback(
    async (
      startDate: string,
      endDate: string,
      habitId?: string
    ): Promise<HabitEntry[]> => {
      if (!session) return [];
      setIsLoadingEntries(true);
      setError(null);
      const params = new URLSearchParams({ startDate, endDate });
      if (habitId) {
        params.append("habitId", habitId);
      }
      try {
        const entries = await authenticatedFetch<HabitEntry[]>(
          `/api/habits/entries?${params.toString()}`,
          "GET",
          session
        );
        // Decide how to merge/update local state - maybe only store last N days?
        // For now, let's just update with the fetched entries if it was a general fetch
        if (!habitId) {
          setHabitEntries(entries || []);
        }
        return entries || [];
      } catch (e) {
        handleError("fetchHabitEntries", e);
        setHabitEntries([]); // Clear on error?
        return [];
      } finally {
        setIsLoadingEntries(false);
      }
    },
    [session, handleError]
  );

  const recordHabitEntry = useCallback(
    async (habitId: string, entryDate: string): Promise<HabitEntry | null> => {
      if (!session) return null;
      // Optimistic update possibility? Maybe not needed if response is fast.
      try {
        const newEntry = await authenticatedFetch<HabitEntry>(
          "/api/habits/entries",
          "POST",
          session,
          { habit_id: habitId, entry_date: entryDate }
        );
        // Add or update entry in local state
        setHabitEntries((prev) => {
          const existingIndex = prev.findIndex(
            (e) => e.habit_id === habitId && e.entry_date === entryDate
          );
          if (existingIndex > -1) {
            // Already exists (likely from unique constraint handling on backend), ensure it's marked completed
            const updatedEntries = [...prev];
            updatedEntries[existingIndex] = {
              ...updatedEntries[existingIndex],
              completed: true,
            };
            return updatedEntries;
          } else {
            return [...prev, newEntry];
          }
        });
        // Find habit name for toast
        const habit = habits.find((h) => h.id === habitId);
        showToast({
          title: "Habit Logged",
          description: `Recorded "${habit?.name || habitId}" for ${entryDate}.`,
        });
        return newEntry;
      } catch (e) {
        handleError("recordHabitEntry", e);
        return null;
      }
    },
    [session, handleError, showToast, habits] // Added habits dependency
  );

  const deleteHabitEntry = useCallback(
    async (entryId: string): Promise<boolean> => {
      if (!session) return false;
      const entryToDelete = habitEntries.find((e) => e.id === entryId);
      const habit = entryToDelete
        ? habits.find((h) => h.id === entryToDelete.habit_id)
        : null;
      try {
        await authenticatedFetch<void>(
          `/api/habits/entries/${entryId}`,
          "DELETE",
          session
        );
        setHabitEntries((prev) => prev.filter((e) => e.id !== entryId));
        showToast({
          title: "Habit Entry Deleted",
          description: `Removed log for "${
            habit?.name || entryToDelete?.habit_id
          }" on ${entryToDelete?.entry_date}.`,
        });
        return true;
      } catch (e) {
        handleError("deleteHabitEntry", e);
        return false;
      }
    },
    [session, handleError, showToast, habitEntries, habits] // Added dependencies
  );

  // --- Helpers ---
  const getEntriesForDate = useCallback(
    (date: string): HabitEntry[] => {
      return habitEntries.filter((entry) => entry.entry_date === date);
    },
    [habitEntries]
  );

  const hasEntryForDate = useCallback(
    (habitId: string, date: string): boolean => {
      return habitEntries.some(
        (entry) => entry.habit_id === habitId && entry.entry_date === date
      );
    },
    [habitEntries]
  );

  // Fetch initial habits and recent entries if needed
  const fetchInitialDataIfNeeded = useCallback(async () => {
    // Make async
    if (!session || isLoadingHabits || isLoadingEntries) return; // Don't fetch if loading or not logged in

    const now = new Date();
    if (
      !lastFetchTime ||
      now.getTime() - lastFetchTime.getTime() > REFRESH_INTERVAL_MS
    ) {
      console.log("Habits refresh interval elapsed, fetching initial data...");
      try {
        // Fetch recent entries arguments
        const today = dayjs().format("YYYY-MM-DD");
        const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");

        // Wait for both fetches to settle
        await Promise.allSettled([
          fetchHabits(),
          fetchHabitEntries(weekAgo, today),
        ]);

        // Update timestamp ONLY after both fetches are done
        setLastFetchTime(new Date());
        console.log("Habits data fetch complete, timestamp updated.");
      } catch (error) {
        // Although Promise.allSettled doesn't throw, good practice to have a catch
        console.error("Error during habits data fetch:", error);
        // Don't update timestamp on error
      }
    } else {
      console.log(
        "Skipping habits initial data fetch, refresh interval not elapsed."
      );
    }
  }, [
    session,
    isLoadingHabits,
    isLoadingEntries,
    lastFetchTime,
    fetchHabits,
    fetchHabitEntries,
  ]);

  // Effect to trigger initial fetch based on session
  useEffect(() => {
    if (session) {
      fetchInitialDataIfNeeded();
    } else {
      // Clear data on logout
      setHabits([]);
      setHabitEntries([]);
      setError(null);
      setLastFetchTime(null); // Clear timestamp on logout
      setIsLoadingHabits(false);
      setIsLoadingEntries(false);
    }
  }, [session, fetchInitialDataIfNeeded]);

  // Optional: Add effect for window visibility change like in TodosContext
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log(
          "Habits Window became visible, checking if fetch needed..."
        );
        fetchInitialDataIfNeeded();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [fetchInitialDataIfNeeded]);

  const value = {
    habits,
    habitEntries,
    isLoadingHabits,
    isLoadingEntries,
    error,
    fetchHabits,
    addHabit,
    updateHabit,
    deleteHabit,
    fetchHabitEntries,
    recordHabitEntry,
    deleteHabitEntry,
    getEntriesForDate,
    hasEntryForDate,
    fetchInitialDataIfNeeded, // Add the function to the provided value
  };

  return (
    <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>
  );
};

export const useHabits = (): HabitsContextType => {
  const context = useContext(HabitsContext);
  if (!context) {
    throw new Error("useHabits must be used within a HabitsProvider");
  }
  return context;
};
