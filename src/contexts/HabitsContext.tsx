import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
  // Removed duplicate useContext
  useEffect,
  useRef, // Added useRef
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";
import { authenticatedFetch, ApiError } from "@/lib/apiClient";
import dayjs from "dayjs"; // Needed for date formatting/comparison
import { useQuests } from "./QuestsContext"; // Import useQuests

// --- Types ---
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  type: "positive" | "negative";
  reminder_time: string | null;
  log_type: "once_daily" | "multiple_daily";
  enable_notification: boolean; // Add the new field
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
    // Omit now includes enable_notification implicitly if it's added to Habit
    newHabitData: Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
  ) => Promise<Habit | null>;
  updateHabit: (
    habitId: string,
    // Omit now includes enable_notification implicitly if it's added to Habit
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
  uncheckOnceDailyHabit: (habitId: string, date: string) => Promise<boolean>; // Add uncheck function type
  // Removed fetchInitialDataIfNeeded from type
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
  // Removed lastFetchTime state
  const { session } = useAuth();
  const { showToast } = useToast();
  const { fetchQuests: fetchQuestsData } = useQuests(); // Get fetchQuests from QuestsContext
  const initialFetchDoneRef = useRef(false); // Ref to track initial fetch

  // Removed REFRESH_INTERVAL_MS constant

  const handleError = useCallback(
    (operation: string, error: unknown) => {
      console.error(`[HabitsContext] Error (${operation}):`, error); // Prefixed log
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
        // Trigger quest refresh after successful recording, with a longer delay
        setTimeout(() => fetchQuestsData({ forceRefresh: true }), 1500); // Delay 1.5s
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

  // --- NEW: Uncheck Once Daily Habit ---
  const uncheckOnceDailyHabit = useCallback(
    async (habitId: string, date: string): Promise<boolean> => {
      if (!session) return false;
      const habit = habits.find((h) => h.id === habitId);
      try {
        await authenticatedFetch<void>(
          `/api/habits/entries/by-date?habitId=${habitId}&entryDate=${date}`, // Use new endpoint
          "DELETE",
          session
        );
        // Remove the entry from local state
        setHabitEntries((prev) =>
          prev.filter(
            (entry) =>
              !(entry.habit_id === habitId && entry.entry_date === date)
          )
        );
        showToast({
          title: "Habit Unchecked",
          description: `Removed log for "${
            habit?.name || habitId
          }" on ${date}.`,
        });
        // Trigger quest refresh after successful uncheck, with a longer delay
        setTimeout(() => fetchQuestsData({ forceRefresh: true }), 1500); // Delay 1.5s
        return true;
      } catch (e) {
        // Handle 404 specifically? Maybe not necessary, error toast is enough.
        handleError("uncheckOnceDailyHabit", e);
        return false;
      }
    },
    [session, handleError, showToast, habits] // Added habits dependency
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

  // Removed fetchInitialDataIfNeeded function

  // Effect to trigger initial fetch based on session - only fetch once
  useEffect(() => {
    if (session && !initialFetchDoneRef.current) {
      // Fetch data directly when session becomes available for the first time
      console.log(
        "[HabitsContext] Session detected for the first time, fetching initial data..."
      ); // Prefixed log
      initialFetchDoneRef.current = true; // Mark initial fetch as done
      const today = dayjs().format("YYYY-MM-DD");
      const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");
      fetchHabits();
      fetchHabitEntries(weekAgo, today);
    } else if (!session) {
      // Clear data and reset flag on logout
      setHabits([]);
      setHabitEntries([]);
      setError(null);
      // Removed setLastFetchTime
      setIsLoadingHabits(false);
      setIsLoadingEntries(false);
      initialFetchDoneRef.current = false; // Reset flag
    }
  }, [session, fetchHabits, fetchHabitEntries]); // Depend on session and fetch functions

  // Removed window visibility change useEffect hook

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
    uncheckOnceDailyHabit, // Add the new function to the context value
    // Removed fetchInitialDataIfNeeded from value
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
