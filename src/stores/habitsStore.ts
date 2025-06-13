import { create } from "zustand";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { authenticatedFetch, ApiError } from "@/lib/apiClient";
import dayjs from "dayjs";

// --- Types ---
export interface Habit {
  id: string;
  user_id: string;
  name: string;
  type: "positive" | "negative";
  reminder_time: string | null;
  log_type: "once_daily" | "multiple_daily";
  enable_notification: boolean;
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

interface HabitsState {
  habits: Habit[];
  habitEntries: HabitEntry[];
  isLoadingHabits: boolean;
  isLoadingEntries: boolean;
  error: string | null;

  _handleError: (operation: string, error: unknown) => void;
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
  ) => Promise<HabitEntry[]>;
  recordHabitEntry: (
    habitId: string,
    entryDate: string
  ) => Promise<HabitEntry | null>;
  deleteHabitEntry: (entryId: string) => Promise<boolean>;
  uncheckOnceDailyHabit: (habitId: string, date: string) => Promise<boolean>;
  getEntriesForDate: (date: string) => HabitEntry[];
  hasEntryForDate: (habitId: string, date: string) => boolean;
}

export const useHabitsStore = create<HabitsState>((set, get) => ({
  habits: [],
  habitEntries: [],
  isLoadingHabits: false,
  isLoadingEntries: false,
  error: null,

  _handleError: (operation: string, error: unknown) => {
    console.error(`[HabitsStore] Error (${operation}):`, error);
    const errorMsg =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
        ? error.message
        : `Unknown error during ${operation}`;
    set({ error: errorMsg });
    useToastStore.getState().showToast({
      title: `Habit Error (${operation})`,
      description: errorMsg,
      variant: "destructive",
    });
  },

  fetchHabits: async () => {
    const session = useAuthStore.getState().session;
    if (!session) return;
    set({ isLoadingHabits: true, error: null });
    try {
      const data = await authenticatedFetch<Habit[]>(
        "/api/habits",
        "GET",
        session
      );
      set({ habits: data || [], isLoadingHabits: false });
    } catch (e) {
      get()._handleError("fetchHabits", e);
      set({ habits: [], isLoadingHabits: false });
    }
  },

  addHabit: async (newHabitData) => {
    const session = useAuthStore.getState().session;
    if (!session) return null;
    // set({ isLoadingHabits: true }); // Or a specific adding state
    try {
      const newHabit = await authenticatedFetch<Habit>(
        "/api/habits",
        "POST",
        session,
        newHabitData
      );
      set((state) => ({ habits: [...state.habits, newHabit] }));
      useToastStore.getState().showToast({
        title: "Habit Added",
        description: `"${newHabit.name}" created.`,
      });
      return newHabit;
    } catch (e) {
      get()._handleError("addHabit", e);
      return null;
    } finally {
      // set({ isLoadingHabits: false });
    }
  },

  updateHabit: async (habitId, updateData) => {
    const session = useAuthStore.getState().session;
    if (!session) return null;
    // set({ isLoadingHabits: true }); // Or a specific updating state
    try {
      const updatedHabit = await authenticatedFetch<Habit>(
        `/api/habits/${habitId}`,
        "PUT",
        session,
        updateData
      );
      set((state) => ({
        habits: state.habits.map((h) => (h.id === habitId ? updatedHabit : h)),
      }));
      useToastStore.getState().showToast({
        title: "Habit Updated",
        description: `"${updatedHabit.name}" saved.`,
      });
      return updatedHabit;
    } catch (e) {
      get()._handleError("updateHabit", e);
      return null;
    } finally {
      // set({ isLoadingHabits: false });
    }
  },

  deleteHabit: async (habitId) => {
    const session = useAuthStore.getState().session;
    if (!session) return false;
    const habitToDelete = get().habits.find((h) => h.id === habitId);
    try {
      await authenticatedFetch<void>(
        `/api/habits/${habitId}`,
        "DELETE",
        session
      );
      set((state) => ({
        habits: state.habits.filter((h) => h.id !== habitId),
        habitEntries: state.habitEntries.filter((e) => e.habit_id !== habitId), // Also remove associated entries
      }));
      useToastStore.getState().showToast({
        title: "Habit Deleted",
        description: `"${habitToDelete?.name || habitId}" removed.`,
      });
      return true;
    } catch (e) {
      get()._handleError("deleteHabit", e);
      return false;
    }
  },

  fetchHabitEntries: async (startDate, endDate, habitId) => {
    const session = useAuthStore.getState().session;
    if (!session) return [];
    set({ isLoadingEntries: true, error: null });
    const params = new URLSearchParams({ startDate, endDate });
    if (habitId) params.append("habitId", habitId);
    try {
      const entries = await authenticatedFetch<HabitEntry[]>(
        `/api/habits/entries?${params.toString()}`,
        "GET",
        session
      );
      // If it's a general fetch (no specific habitId), update the main habitEntries state.
      // If it's for a specific habit, the caller might handle the result directly.
      // For now, always update the main state if it's a general fetch.
      if (!habitId) {
        set({ habitEntries: entries || [], isLoadingEntries: false });
      } else {
        // If fetching for a specific habit, merge with existing entries or handle as needed.
        // This example replaces entries for simplicity if habitId is provided,
        // but a merge strategy might be better in a real app.
        set((state) => ({
          habitEntries: [
            ...state.habitEntries.filter((e) => e.habit_id !== habitId), // remove old entries for this habit
            ...(entries || []), // add new ones
          ].sort(
            (a, b) =>
              new Date(a.entry_date).getTime() -
              new Date(b.entry_date).getTime()
          ), // keep sorted
          isLoadingEntries: false,
        }));
      }
      return entries || [];
    } catch (e) {
      get()._handleError("fetchHabitEntries", e);
      set({ habitEntries: [], isLoadingEntries: false });
      return [];
    }
  },

  recordHabitEntry: async (habitId, entryDate) => {
    const session = useAuthStore.getState().session;
    if (!session) return null;
    try {
      const newEntry = await authenticatedFetch<HabitEntry>(
        "/api/habits/entries",
        "POST",
        session,
        { habit_id: habitId, entry_date: entryDate }
      );
      set((state) => {
        const existingIndex = state.habitEntries.findIndex(
          (e) => e.habit_id === habitId && e.entry_date === entryDate
        );
        if (existingIndex > -1) {
          const updatedEntries = [...state.habitEntries];
          updatedEntries[existingIndex] = {
            ...updatedEntries[existingIndex],
            completed: true,
            id: newEntry.id,
            created_at: newEntry.created_at,
          }; // ensure new ID is used
          return { habitEntries: updatedEntries };
        }
        return {
          habitEntries: [...state.habitEntries, newEntry].sort(
            (a, b) =>
              new Date(a.entry_date).getTime() -
              new Date(b.entry_date).getTime()
          ),
        };
      });
      const habit = get().habits.find((h) => h.id === habitId);
      useToastStore.getState().showToast({
        title: "Habit Logged",
        description: `Recorded "${habit?.name || habitId}" for ${entryDate}.`,
      });
      // TODO: Quests system disabled. Original call: setTimeout(() => fetchQuestsData({ forceRefresh: true }), 1500);
      return newEntry;
    } catch (e) {
      get()._handleError("recordHabitEntry", e);
      return null;
    }
  },

  deleteHabitEntry: async (entryId) => {
    const session = useAuthStore.getState().session;
    if (!session) return false;
    const entryToDelete = get().habitEntries.find((e) => e.id === entryId);
    const habit = entryToDelete
      ? get().habits.find((h) => h.id === entryToDelete.habit_id)
      : null;
    try {
      await authenticatedFetch<void>(
        `/api/habits/entries/${entryId}`,
        "DELETE",
        session
      );
      set((state) => ({
        habitEntries: state.habitEntries.filter((e) => e.id !== entryId),
      }));
      useToastStore.getState().showToast({
        title: "Habit Entry Deleted",
        description: `Removed log for "${
          habit?.name || entryToDelete?.habit_id
        }" on ${entryToDelete?.entry_date}.`,
      });
      return true;
    } catch (e) {
      get()._handleError("deleteHabitEntry", e);
      return false;
    }
  },

  uncheckOnceDailyHabit: async (habitId, date) => {
    const session = useAuthStore.getState().session;
    if (!session) return false;
    const habit = get().habits.find((h) => h.id === habitId);
    try {
      await authenticatedFetch<void>(
        `/api/habits/entries/by-date?habitId=${habitId}&entryDate=${date}`,
        "DELETE",
        session
      );
      set((state) => ({
        habitEntries: state.habitEntries.filter(
          (entry) => !(entry.habit_id === habitId && entry.entry_date === date)
        ),
      }));
      useToastStore.getState().showToast({
        title: "Habit Unchecked",
        description: `Removed log for "${habit?.name || habitId}" on ${date}.`,
      });
      // TODO: Quests system disabled. Original call: setTimeout(() => fetchQuestsData({ forceRefresh: true }), 1500);
      return true;
    } catch (e) {
      get()._handleError("uncheckOnceDailyHabit", e);
      return false;
    }
  },

  getEntriesForDate: (date) => {
    return get().habitEntries.filter((entry) => entry.entry_date === date);
  },

  hasEntryForDate: (habitId, date) => {
    return get().habitEntries.some(
      (entry) =>
        entry.habit_id === habitId &&
        entry.entry_date === date &&
        entry.completed
    );
  },
}));

// --- Auth Subscription ---
let currentAuthSessionHabitsToken =
  useAuthStore.getState().session?.access_token;
let initialHabitsFetchCompletedForSession = false;

useAuthStore.subscribe((state) => {
  const newSession = state.session;
  const { fetchHabits, fetchHabitEntries } = useHabitsStore.getState();
  const newAuthSessionHabitsToken = newSession?.access_token;

  if (newAuthSessionHabitsToken && !initialHabitsFetchCompletedForSession) {
    console.log(
      "[HabitsStore] Auth session detected, fetching initial habits data..."
    );
    const today = dayjs().format("YYYY-MM-DD");
    const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");
    fetchHabits();
    fetchHabitEntries(weekAgo, today);
    initialHabitsFetchCompletedForSession = true;
  } else if (!newAuthSessionHabitsToken) {
    console.log("[HabitsStore] Auth session removed, clearing habits data...");
    useHabitsStore.setState({
      habits: [],
      habitEntries: [],
      error: null,
      isLoadingHabits: false,
      isLoadingEntries: false,
    });
    initialHabitsFetchCompletedForSession = false;
  } else if (
    newAuthSessionHabitsToken &&
    newAuthSessionHabitsToken !== currentAuthSessionHabitsToken
  ) {
    console.log(
      "[HabitsStore] Auth session refreshed, refetching habits data..."
    );
    const today = dayjs().format("YYYY-MM-DD");
    const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");
    fetchHabits();
    fetchHabitEntries(weekAgo, today);
  }
  currentAuthSessionHabitsToken = newAuthSessionHabitsToken;
});

if (currentAuthSessionHabitsToken && !initialHabitsFetchCompletedForSession) {
  console.log(
    "[HabitsStore] Initial auth session present on load, fetching habits data..."
  );
  const today = dayjs().format("YYYY-MM-DD");
  const weekAgo = dayjs().subtract(7, "day").format("YYYY-MM-DD");
  useHabitsStore.getState().fetchHabits();
  useHabitsStore.getState().fetchHabitEntries(weekAgo, today);
  initialHabitsFetchCompletedForSession = true;
}
