import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from "date-fns"; // Import date-fns functions
import { authenticatedFetch, ApiError } from "@/lib/apiClient"; // Import the new utility and error class

// --- Types ---

interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

interface FinanceSettings {
  currency: string | null;
  daily_allowance_goal: number | null;
  salary_schedule: SalaryPayment[] | null;
  current_balance: number | null; // This is fetched but not exposed by context
}

interface FinanceEntry {
  id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  created_at: string;
}

// Type for weekly summary data from API
interface WeeklyExpenseSummary {
  date: string; // YYYY-MM-DD
  totalAmount: number;
}

// Type exposed by the context (omitting current_balance from settings)
type ExposedFinanceSettings = Omit<FinanceSettings, "current_balance">;

interface FinanceContextType {
  settings: ExposedFinanceSettings | null;
  todaysExpenses: FinanceEntry[];
  remainingToday: number | null;
  isLoadingSettings: boolean;
  isLoadingEntries: boolean;
  error: string | null;
  addExpense: (
    amount: number,
    description?: string | null,
    entryDate?: string | null
  ) => Promise<boolean>;
  deleteExpense: (entryId: string) => Promise<boolean>;
  updateSettings: (
    newSettings: Partial<ExposedFinanceSettings>
  ) => Promise<boolean>;
  currentReportWeekStart: Date;
  weeklyExpensesData: WeeklyExpenseSummary[];
  isLoadingWeeklyEntries: boolean;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  goToCurrentWeek: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

// --- Provider Component ---

interface FinanceProviderProps {
  children: React.ReactNode;
}

export const FinanceProvider: React.FC<FinanceProviderProps> = ({
  children,
}) => {
  const { session, isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast();
  // Removed token variable

  const [settings, setSettings] = useState<ExposedFinanceSettings | null>(null);
  const [todaysExpenses, setTodaysExpenses] = useState<FinanceEntry[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for weekly report
  const [currentReportWeekStart, setCurrentReportWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [weeklyExpensesData, setWeeklyExpensesData] = useState<
    WeeklyExpenseSummary[]
  >([]);
  const [isLoadingWeeklyEntries, setIsLoadingWeeklyEntries] = useState(true);

  // --- Fetch Functions ---

  const fetchSettings = useCallback(async () => {
    if (!session) {
      setIsLoadingSettings(false);
      return;
    }
    setIsLoadingSettings(true);
    setError(null);
    try {
      // Use authenticatedFetch, expecting the full FinanceSettings type from API
      const data = await authenticatedFetch<FinanceSettings>(
        "/api/finance/settings",
        "GET",
        session
      );
      // Destructure to omit current_balance before setting state
      const { current_balance: _current_balance, ...relevantSettings } = data;
      setSettings(relevantSettings);
      console.log("Finance settings loaded:", relevantSettings);
    } catch (err) {
      console.error("Error fetching finance settings:", err);
      const message =
        err instanceof Error ? err.message : "Failed to load finance settings";
      setError(message);
      showToast({
        title: "Settings Error",
        description: message,
        variant: "error",
      });
      setSettings(null);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [session, showToast]); // Removed token dependency

  const fetchTodaysEntries = useCallback(async () => {
    if (!session) {
      setIsLoadingEntries(false);
      return;
    }
    setIsLoadingEntries(true);
    // setError(null); // Keep previous errors unless explicitly cleared? Or clear here? Let's clear.
    setError(null);
    try {
      // Use authenticatedFetch, expecting FinanceEntry[]
      const data = await authenticatedFetch<FinanceEntry[]>(
        "/api/finance/entries/today",
        "GET",
        session
      );
      setTodaysExpenses(data);
      console.log("Today's finance entries loaded:", data);
    } catch (err) {
      console.error("Error fetching today's finance entries:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Failed to load today's finance entries";
      setError(message);
      showToast({
        title: "Entries Error",
        description: message,
        variant: "error",
      });
      setTodaysExpenses([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [session, showToast]); // Removed token dependency

  // Fetch Weekly Entries
  const fetchWeeklyExpenses = useCallback(
    async (weekStartDate: Date) => {
      if (!session) {
        setIsLoadingWeeklyEntries(false);
        return;
      }
      setIsLoadingWeeklyEntries(true);
      setError(null); // Clear previous errors specific to weekly fetch

      const startDateStr = format(weekStartDate, "yyyy-MM-dd");
      const endDateStr = format(
        endOfWeek(weekStartDate, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );
      const url = `/api/finance/entries/weekly?startDate=${startDateStr}&endDate=${endDateStr}`;

      try {
        // Use authenticatedFetch, expecting WeeklyExpenseSummary[]
        const data = await authenticatedFetch<WeeklyExpenseSummary[]>(
          url,
          "GET",
          session
        );
        setWeeklyExpensesData(data);
        console.log(
          `Weekly expenses loaded for week starting ${startDateStr}:`,
          data
        );
      } catch (err) {
        console.error("Error fetching weekly expenses:", err);
        const message =
          err instanceof Error ? err.message : "Failed to load weekly expenses";
        setError(message);
        showToast({
          title: "Weekly Data Error",
          description: message,
          variant: "error",
        });
        setWeeklyExpensesData([]); // Reset on error
      } finally {
        setIsLoadingWeeklyEntries(false);
      }
    },
    [session, showToast] // Removed token dependency
  );

  // --- Initial Fetches based on Auth State ---
  // This effect structure remains largely the same, relying on session presence
  useEffect(() => {
    console.log("FinanceDataSource: Auth Effect Triggered", {
      isAuthLoading,
      sessionExists: !!session,
    });
    if (!isAuthLoading && session) {
      console.log("FinanceDataSource: Fetching initial data...");
      fetchSettings();
      fetchTodaysEntries();
      fetchWeeklyExpenses(currentReportWeekStart); // Fetch initial week
    } else if (!isAuthLoading && !session) {
      console.log("FinanceDataSource: Clearing data on logout");
      setSettings(null);
      setTodaysExpenses([]);
      setWeeklyExpensesData([]);
      setIsLoadingSettings(false);
      setIsLoadingEntries(false);
      setIsLoadingWeeklyEntries(false);
      setError(null);
      // Reset week start on logout? Maybe not necessary if UI resets.
      // setCurrentReportWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  }, [
    isAuthLoading,
    session, // Depend on session object itself
    fetchSettings,
    fetchTodaysEntries,
    fetchWeeklyExpenses,
    currentReportWeekStart, // Keep this dependency for initial fetch
  ]);

  // --- Effect to fetch weekly data when week changes ---
  // This effect also remains largely the same
  useEffect(() => {
    if (!isAuthLoading && session) {
      console.log(
        "FinanceDataSource: Week changed, fetching weekly expenses for:",
        currentReportWeekStart
      );
      fetchWeeklyExpenses(currentReportWeekStart);
    }
  }, [currentReportWeekStart, session, isAuthLoading, fetchWeeklyExpenses]); // Depend on week start, session, auth loading, and the fetch function

  // --- Action Functions ---

  const addExpense = useCallback(
    async (
      amount: number,
      description?: string | null,
      entryDate?: string | null
    ): Promise<boolean> => {
      if (!session) {
        setError("Authentication required to add expense.");
        showToast({
          title: "Auth Error",
          description: "Please log in.",
          variant: "error",
        });
        return false;
      }
      // Consider a specific loading state? For now, using general error state.
      setError(null);
      try {
        const body: {
          amount: number;
          description: string | null;
          entry_date?: string;
        } = {
          amount,
          description: description || null,
        };
        if (entryDate) {
          body.entry_date = entryDate;
        }

        // Use authenticatedFetch for POST
        await authenticatedFetch<void>(
          "/api/finance/entries",
          "POST",
          session,
          body
        );

        // Refetch logic remains the same
        const todayStr = format(new Date(), "yyyy-MM-dd");
        const addedDateStr = entryDate || todayStr;
        const weekStartStr = format(currentReportWeekStart, "yyyy-MM-dd");
        const weekEndStr = format(
          endOfWeek(currentReportWeekStart, { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );

        const fetchesToRun = [];
        if (addedDateStr === todayStr) {
          fetchesToRun.push(fetchTodaysEntries());
        }
        if (addedDateStr >= weekStartStr && addedDateStr <= weekEndStr) {
          fetchesToRun.push(fetchWeeklyExpenses(currentReportWeekStart));
        }

        if (fetchesToRun.length > 0) {
          await Promise.all(fetchesToRun);
        }

        showToast({
          title: "Expense Recorded",
          description: `${
            description || `Amount: ${amount}`
          } on ${addedDateStr}`,
          variant: "success", // Use success variant
        });
        return true;
      } catch (err) {
        console.error("Error adding expense:", err);
        const message =
          err instanceof Error ? err.message : "Failed to add expense";
        setError(message);
        showToast({
          title: "Add Expense Error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
      // No finally block needed here as loading state isn't managed per-action
    },
    [
      session, // Depend on session
      fetchTodaysEntries,
      fetchWeeklyExpenses,
      currentReportWeekStart,
      showToast,
    ]
  );

  const deleteExpense = useCallback(
    async (entryId: string): Promise<boolean> => {
      if (!session) {
        setError("Authentication required to delete expense.");
        showToast({
          title: "Auth Error",
          description: "Please log in.",
          variant: "error",
        });
        return false;
      }
      const originalExpenses = [...todaysExpenses];
      const entryToDelete = todaysExpenses.find(
        (entry) => entry.id === entryId
      );

      // Optimistic UI update remains the same
      setTodaysExpenses((prev) => prev.filter((entry) => entry.id !== entryId));
      setError(null); // Clear previous errors

      try {
        // Use authenticatedFetch for DELETE
        await authenticatedFetch<void>(
          `/api/finance/entries/${entryId}`,
          "DELETE",
          session
        );

        // Refetch weekly data if the deleted entry was in the current week
        const deletedDateStr = entryToDelete?.entry_date;
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
          // Don't await here, let it run in background after success confirmation
          fetchWeeklyExpenses(currentReportWeekStart);
        }

        showToast({ title: "Expense Deleted", variant: "success" });
        return true;
      } catch (err) {
        console.error("Error deleting expense:", err);
        setTodaysExpenses(originalExpenses); // Revert optimistic update
        // Refetch weekly data on error as well to be safe
        fetchWeeklyExpenses(currentReportWeekStart); // Don't await
        const message =
          err instanceof Error ? err.message : "Failed to delete expense";
        setError(message);
        showToast({
          title: "Delete Error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      session, // Depend on session
      todaysExpenses,
      fetchWeeklyExpenses,
      currentReportWeekStart,
      showToast,
    ]
  );

  const updateSettings = useCallback(
    async (newSettings: Partial<ExposedFinanceSettings>): Promise<boolean> => {
      if (!session) {
        setError("Authentication required to update settings.");
        showToast({
          title: "Auth Error",
          description: "Please log in.",
          variant: "error",
        });
        return false;
      }
      setIsLoadingSettings(true); // Keep specific loading state for settings update
      setError(null);
      try {
        // Use authenticatedFetch for PUT, expecting full FinanceSettings back
        const updatedSettingsData = await authenticatedFetch<FinanceSettings>(
          "/api/finance/settings",
          "PUT",
          session,
          newSettings // Send partial settings
        );
        // Omit balance before setting state
        const { current_balance: _cb, ...relevantSettings } =
          updatedSettingsData;
        setSettings(relevantSettings);
        showToast({ title: "Finance Settings Updated", variant: "success" });
        return true;
      } catch (err) {
        console.error("Error updating finance settings:", err);
        const message =
          err instanceof Error ? err.message : "Failed to update settings";
        setError(message);
        showToast({
          title: "Settings Update Error",
          description: message,
          variant: "destructive",
        });
        // Optionally refetch settings on error to revert optimistic UI if needed
        // await fetchSettings();
        return false;
      } finally {
        setIsLoadingSettings(false);
      }
    },
    [session, showToast] // Removed token, fetchSettings dependency
  );

  // --- Week Navigation Functions ---
  // These remain the same, only updating state
  const goToPreviousWeek = useCallback(() => {
    setCurrentReportWeekStart((prev) => subWeeks(prev, 1));
  }, []);

  const goToNextWeek = useCallback(() => {
    setCurrentReportWeekStart((prev) => addWeeks(prev, 1));
  }, []);

  const goToCurrentWeek = useCallback(() => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    setCurrentReportWeekStart((prev) =>
      prev.getTime() === currentWeekStart.getTime() ? prev : currentWeekStart
    );
  }, []);

  // --- Context Value ---
  const calculatedRemainingToday = useMemo(() => {
    if (
      settings?.daily_allowance_goal === null ||
      settings?.daily_allowance_goal === undefined
    ) {
      return null;
    }
    const totalSpent = todaysExpenses.reduce(
      (sum, entry) => sum + entry.amount,
      0
    );
    return settings.daily_allowance_goal - totalSpent;
  }, [settings, todaysExpenses]);

  const value = useMemo(
    () => ({
      settings,
      todaysExpenses,
      remainingToday: calculatedRemainingToday,
      isLoadingSettings,
      isLoadingEntries,
      error,
      addExpense,
      deleteExpense,
      updateSettings,
      currentReportWeekStart,
      weeklyExpensesData,
      isLoadingWeeklyEntries,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
    }),
    [
      settings,
      todaysExpenses,
      calculatedRemainingToday,
      isLoadingSettings,
      isLoadingEntries,
      error,
      addExpense,
      deleteExpense,
      updateSettings,
      currentReportWeekStart,
      weeklyExpensesData,
      isLoadingWeeklyEntries,
      goToPreviousWeek,
      goToNextWeek,
      goToCurrentWeek,
    ]
  );

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
};

// --- Hook ---

export const useFinance = (): FinanceContextType => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
};
