import { create } from "zustand";
import { useAuthStore } from "@/stores/authStore";
import { useToastStore } from "@/stores/toastStore";
import { authenticatedFetch } from "@/lib/apiClient";
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from "date-fns";

// --- Types ---
export interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

export interface FinanceSettings {
  currency: string | null;
  daily_allowance_goal: number | null;
  salary_schedule: SalaryPayment[] | null;
  current_balance: number | null;
}

export interface FinanceEntry {
  id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  created_at: string;
}

export interface WeeklyExpenseSummary {
  date: string; // YYYY-MM-DD
  totalAmount: number;
}

export type ExposedFinanceSettings = Omit<FinanceSettings, "current_balance">;

interface FinanceState {
  settings: ExposedFinanceSettings | null;
  todaysExpenses: FinanceEntry[];
  remainingToday: number | null;
  isLoadingSettings: boolean;
  isLoadingEntries: boolean;
  isLoadingWeeklyEntries: boolean;
  error: string | null;
  currentReportWeekStart: Date;
  weeklyExpensesData: WeeklyExpenseSummary[];

  fetchSettings: () => Promise<void>;
  fetchTodaysEntries: () => Promise<void>;
  fetchWeeklyExpenses: (weekStartDate: Date) => Promise<void>;
  addExpense: (
    amount: number,
    description?: string | null,
    entryDate?: string | null
  ) => Promise<boolean>;
  deleteExpense: (entryId: string) => Promise<boolean>;
  updateSettings: (
    newSettings: Partial<ExposedFinanceSettings>
  ) => Promise<boolean>;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
  _calculateRemainingToday: () => void;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  settings: null,
  todaysExpenses: [],
  remainingToday: null,
  isLoadingSettings: true, // Start as true for initial load
  isLoadingEntries: true, // Start as true
  isLoadingWeeklyEntries: true, // Start as true
  error: null,
  currentReportWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
  weeklyExpensesData: [],

  _calculateRemainingToday: () => {
    set((state) => {
      if (
        state.settings?.daily_allowance_goal === null ||
        state.settings?.daily_allowance_goal === undefined
      ) {
        return { remainingToday: null };
      }
      const totalSpent = state.todaysExpenses.reduce(
        (sum, entry) => sum + entry.amount,
        0
      );
      return {
        remainingToday: state.settings.daily_allowance_goal - totalSpent,
      };
    });
  },

  fetchSettings: async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ isLoadingSettings: false, settings: null });
      get()._calculateRemainingToday();
      return;
    }
    set({ isLoadingSettings: true, error: null });
    try {
      const data = await authenticatedFetch<FinanceSettings>(
        "/api/finance/settings",
        "GET",
        session
      );
      const { current_balance: _current_balance, ...relevantSettings } = data;
      set({ settings: relevantSettings, isLoadingSettings: false });
      get()._calculateRemainingToday();
    } catch (err: any) {
      console.error("[FinanceStore] Error fetching finance settings:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load finance settings";
      set({ isLoadingSettings: false, error: message, settings: null });
      useToastStore.getState().showToast({
        title: "Settings Error",
        description: message,
        variant: "error",
      });
      get()._calculateRemainingToday();
    }
  },

  fetchTodaysEntries: async () => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ isLoadingEntries: false, todaysExpenses: [] });
      get()._calculateRemainingToday();
      return;
    }
    set({ isLoadingEntries: true, error: null });
    try {
      const data = await authenticatedFetch<FinanceEntry[]>(
        "/api/finance/entries/today",
        "GET",
        session
      );
      set({ todaysExpenses: data || [], isLoadingEntries: false });
      get()._calculateRemainingToday();
    } catch (err: any) {
      console.error(
        "[FinanceStore] Error fetching today's finance entries:",
        err
      );
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load today's finance entries";
      set({ isLoadingEntries: false, error: message, todaysExpenses: [] });
      useToastStore.getState().showToast({
        title: "Entries Error",
        description: message,
        variant: "error",
      });
      get()._calculateRemainingToday();
    }
  },

  fetchWeeklyExpenses: async (weekStartDate: Date) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      set({ isLoadingWeeklyEntries: false, weeklyExpensesData: [] });
      return;
    }
    set({ isLoadingWeeklyEntries: true, error: null });
    const startDateStr = format(weekStartDate, "yyyy-MM-dd");
    const endDateStr = format(
      endOfWeek(weekStartDate, { weekStartsOn: 1 }),
      "yyyy-MM-dd"
    );
    const url = `/api/finance/entries/weekly?startDate=${startDateStr}&endDate=${endDateStr}`;
    try {
      const data = await authenticatedFetch<WeeklyExpenseSummary[]>(
        url,
        "GET",
        session
      );
      set({ weeklyExpensesData: data || [], isLoadingWeeklyEntries: false });
    } catch (err: any) {
      console.error("[FinanceStore] Error fetching weekly expenses:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load weekly expenses";
      set({
        isLoadingWeeklyEntries: false,
        error: message,
        weeklyExpensesData: [],
      });
      useToastStore.getState().showToast({
        title: "Weekly Data Error",
        description: message,
        variant: "error",
      });
    }
  },

  addExpense: async (amount, description, entryDate) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return false;
    }
    set({ error: null }); // Clear previous errors
    try {
      const body: {
        amount: number;
        description: string | null;
        entry_date?: string;
      } = {
        amount,
        description: description || null,
      };
      if (entryDate) body.entry_date = entryDate;

      await authenticatedFetch<void>(
        "/api/finance/entries",
        "POST",
        session,
        body
      );

      const todayStr = format(new Date(), "yyyy-MM-dd");
      const addedDateStr = entryDate || todayStr;
      const currentReportWeekStart = get().currentReportWeekStart;
      const weekStartStr = format(currentReportWeekStart, "yyyy-MM-dd");
      const weekEndStr = format(
        endOfWeek(currentReportWeekStart, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );

      const fetchesToRun: Promise<void>[] = [];
      if (addedDateStr === todayStr) {
        fetchesToRun.push(get().fetchTodaysEntries());
      }
      if (addedDateStr >= weekStartStr && addedDateStr <= weekEndStr) {
        fetchesToRun.push(get().fetchWeeklyExpenses(currentReportWeekStart));
      }

      if (fetchesToRun.length > 0) await Promise.all(fetchesToRun);
      else get()._calculateRemainingToday(); // Ensure remainingToday is updated if no fetches run

      useToastStore.getState().showToast({
        title: "Expense Recorded",
        description: `${description || `Amount: ${amount}`} on ${addedDateStr}`,
        variant: "success",
      });
      return true;
    } catch (err: any) {
      console.error("[FinanceStore] Error adding expense:", err);
      const message =
        err instanceof Error ? err.message : "Failed to add expense";
      set({ error: message });
      useToastStore.getState().showToast({
        title: "Add Expense Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  },

  deleteExpense: async (entryId) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return false;
    }
    const originalExpenses = [...get().todaysExpenses];
    const entryToDelete = originalExpenses.find(
      (entry) => entry.id === entryId
    );

    set((state) => ({
      todaysExpenses: state.todaysExpenses.filter(
        (entry) => entry.id !== entryId
      ),
      error: null,
    }));
    get()._calculateRemainingToday();

    try {
      await authenticatedFetch<void>(
        `/api/finance/entries/${entryId}`,
        "DELETE",
        session
      );

      const deletedDateStr = entryToDelete?.entry_date;
      const currentReportWeekStart = get().currentReportWeekStart;
      const weekStartStr = format(currentReportWeekStart, "yyyy-MM-dd");
      const weekEndStr = format(
        endOfWeek(currentReportWeekStart, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );

      if (
        deletedDateStr &&
        deletedDateStr >= weekStartStr &&
        deletedDateStr <= weekEndStr
      ) {
        await get().fetchWeeklyExpenses(currentReportWeekStart);
      }
      useToastStore
        .getState()
        .showToast({ title: "Expense Deleted", variant: "success" });
      return true;
    } catch (err: any) {
      set({ todaysExpenses: originalExpenses, error: err.message });
      get()._calculateRemainingToday();
      await get().fetchWeeklyExpenses(get().currentReportWeekStart); // Refetch weekly on error too
      console.error("[FinanceStore] Error deleting expense:", err);
      const message =
        err instanceof Error ? err.message : "Failed to delete expense";
      useToastStore.getState().showToast({
        title: "Delete Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  },

  updateSettings: async (newSettings) => {
    const session = useAuthStore.getState().session;
    if (!session) {
      useToastStore.getState().showToast({
        title: "Auth Error",
        description: "Please log in.",
        variant: "error",
      });
      return false;
    }
    set({ isLoadingSettings: true, error: null });
    try {
      const updatedSettingsData = await authenticatedFetch<FinanceSettings>(
        "/api/finance/settings",
        "PUT",
        session,
        newSettings
      );
      const { current_balance: _cb, ...relevantSettings } = updatedSettingsData;
      set({ settings: relevantSettings, isLoadingSettings: false });
      get()._calculateRemainingToday();
      useToastStore
        .getState()
        .showToast({ title: "Finance Settings Updated", variant: "success" });
      return true;
    } catch (err: any) {
      console.error("[FinanceStore] Error updating finance settings:", err);
      const message =
        err instanceof Error ? err.message : "Failed to update settings";
      set({ isLoadingSettings: false, error: message });
      // No automatic refetch on error, user might want to retry with current form data
      useToastStore.getState().showToast({
        title: "Settings Update Error",
        description: message,
        variant: "destructive",
      });
      return false;
    }
  },

  goToPreviousWeek: () => {
    set((state) => {
      const newWeekStart = subWeeks(state.currentReportWeekStart, 1);
      get().fetchWeeklyExpenses(newWeekStart); // Fetch data for the new week
      return { currentReportWeekStart: newWeekStart };
    });
  },
  goToNextWeek: () => {
    set((state) => {
      const newWeekStart = addWeeks(state.currentReportWeekStart, 1);
      get().fetchWeeklyExpenses(newWeekStart);
      return { currentReportWeekStart: newWeekStart };
    });
  },
  goToCurrentWeek: () => {
    set((state) => {
      const newWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
      if (state.currentReportWeekStart.getTime() !== newWeekStart.getTime()) {
        get().fetchWeeklyExpenses(newWeekStart);
      }
      return { currentReportWeekStart: newWeekStart };
    });
  },
}));

// --- Auth Subscription ---
let currentAuthSessionFinanceToken =
  useAuthStore.getState().session?.access_token;
let initialFinanceFetchCompletedForSession = false;

useAuthStore.subscribe((state) => {
  const newSession = state.session;
  const {
    fetchSettings,
    fetchTodaysEntries,
    fetchWeeklyExpenses,
    currentReportWeekStart,
    settings,
  } = useFinanceStore.getState();
  const newAuthSessionFinanceToken = newSession?.access_token;

  if (newAuthSessionFinanceToken && !initialFinanceFetchCompletedForSession) {
    console.log(
      "[FinanceStore] Auth session detected, fetching initial finance data..."
    );
    fetchSettings();
    fetchTodaysEntries();
    fetchWeeklyExpenses(currentReportWeekStart);
    initialFinanceFetchCompletedForSession = true;
  } else if (!newAuthSessionFinanceToken) {
    // User signed out
    console.log(
      "[FinanceStore] Auth session removed, clearing finance data..."
    );
    useFinanceStore.setState({
      settings: null,
      todaysExpenses: [],
      remainingToday: null,
      weeklyExpensesData: [],
      isLoadingSettings: false,
      isLoadingEntries: false,
      isLoadingWeeklyEntries: false,
      error: null,
      currentReportWeekStart: startOfWeek(new Date(), { weekStartsOn: 1 }),
    });
    initialFinanceFetchCompletedForSession = false;
  } else if (
    newAuthSessionFinanceToken &&
    newAuthSessionFinanceToken !== currentAuthSessionFinanceToken
  ) {
    // Session changed (e.g. refreshed), refetch data if needed
    // This might be redundant if initial fetch already covers it or if components trigger fetches
    console.log(
      "[FinanceStore] Auth session refreshed/changed, considering refetch of finance data..."
    );
    if (!settings) fetchSettings(); // Fetch settings if they are not there
    fetchTodaysEntries(); // Always get latest for today
    fetchWeeklyExpenses(currentReportWeekStart); // Refresh current week view
  }
  currentAuthSessionFinanceToken = newAuthSessionFinanceToken;
});

// Initial fetch if session already exists on load and not yet fetched for this session
if (currentAuthSessionFinanceToken && !initialFinanceFetchCompletedForSession) {
  console.log(
    "[FinanceStore] Initial auth session present on load, fetching finance data..."
  );
  useFinanceStore.getState().fetchSettings();
  useFinanceStore.getState().fetchTodaysEntries();
  useFinanceStore
    .getState()
    .fetchWeeklyExpenses(useFinanceStore.getState().currentReportWeekStart);
  initialFinanceFetchCompletedForSession = true;
}
