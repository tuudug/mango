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

// --- Types ---

interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

interface FinanceSettings {
  currency: string | null;
  daily_allowance_goal: number | null;
  salary_schedule: SalaryPayment[] | null;
  current_balance: number | null;
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

interface FinanceContextType {
  settings: Omit<FinanceSettings, "current_balance"> | null;
  todaysExpenses: FinanceEntry[];
  remainingToday: number | null;
  isLoadingSettings: boolean;
  isLoadingEntries: boolean;
  error: string | null;
  // Update addExpense signature
  addExpense: (
    amount: number,
    description?: string | null,
    entryDate?: string | null // Add optional date string (YYYY-MM-DD)
  ) => Promise<boolean>;
  deleteExpense: (entryId: string) => Promise<boolean>;
  updateSettings: (
    newSettings: Partial<Omit<FinanceSettings, "current_balance">>
  ) => Promise<boolean>;
  // New state and functions for weekly report
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
  const token = session?.access_token;

  const [settings, setSettings] = useState<Omit<
    FinanceSettings,
    "current_balance"
  > | null>(null);
  const [todaysExpenses, setTodaysExpenses] = useState<FinanceEntry[]>([]);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for weekly report
  const [currentReportWeekStart, setCurrentReportWeekStart] = useState<Date>(
    startOfWeek(new Date(), { weekStartsOn: 1 }) // Default to current week, starting Monday
  );
  const [weeklyExpensesData, setWeeklyExpensesData] = useState<
    WeeklyExpenseSummary[]
  >([]);
  const [isLoadingWeeklyEntries, setIsLoadingWeeklyEntries] = useState(true);

  // --- Fetch Functions ---

  const fetchSettings = useCallback(async () => {
    // ... (fetchSettings implementation remains the same) ...
    if (!token) {
      setIsLoadingSettings(false);
      return;
    }
    setIsLoadingSettings(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch finance settings: ${response.statusText}`
        );
      }
      const data: FinanceSettings = await response.json();
      const { current_balance: _current_balance, ...relevantSettings } = data;
      setSettings(relevantSettings);
      console.log("Finance settings loaded:", relevantSettings);
    } catch (err) {
      console.error("Error fetching finance settings:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load finance settings"
      );
      setSettings(null);
    } finally {
      setIsLoadingSettings(false);
    }
  }, [token]);

  const fetchTodaysEntries = useCallback(async () => {
    // ... (fetchTodaysEntries implementation remains the same) ...
    if (!token) {
      setIsLoadingEntries(false);
      return;
    }
    setIsLoadingEntries(true);
    try {
      const response = await fetch("/api/finance/entries/today", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error(
          `Failed to fetch today's finance entries: ${response.statusText}`
        );
      }
      const data: FinanceEntry[] = await response.json();
      setTodaysExpenses(data);
      console.log("Today's finance entries loaded:", data);
    } catch (err) {
      console.error("Error fetching today's finance entries:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load today's finance entries"
      );
      setTodaysExpenses([]);
    } finally {
      setIsLoadingEntries(false);
    }
  }, [token]);

  // Fetch Weekly Entries
  const fetchWeeklyExpenses = useCallback(
    async (weekStartDate: Date) => {
      if (!token) {
        setIsLoadingWeeklyEntries(false);
        return;
      }
      setIsLoadingWeeklyEntries(true);
      setError(null); // Clear previous errors specific to weekly fetch?

      const startDateStr = format(weekStartDate, "yyyy-MM-dd");
      const endDateStr = format(
        endOfWeek(weekStartDate, { weekStartsOn: 1 }),
        "yyyy-MM-dd"
      );

      try {
        const response = await fetch(
          `/api/finance/entries/weekly?startDate=${startDateStr}&endDate=${endDateStr}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!response.ok) {
          throw new Error(
            `Failed to fetch weekly expenses: ${response.statusText}`
          );
        }
        const data: WeeklyExpenseSummary[] = await response.json();
        setWeeklyExpensesData(data);
        console.log(
          `Weekly expenses loaded for week starting ${startDateStr}:`,
          data
        );
      } catch (err) {
        console.error("Error fetching weekly expenses:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load weekly expenses"
        );
        setWeeklyExpensesData([]); // Reset on error
      } finally {
        setIsLoadingWeeklyEntries(false);
      }
    },
    [token]
  );

  // --- Initial Fetches based on Auth State ---
  useEffect(() => {
    // This effect should run ONLY when auth state changes
    console.log("FinanceDataSource: Auth Effect Triggered", {
      isAuthLoading,
      tokenExists: !!token,
    });
    if (!isAuthLoading && token) {
      console.log("FinanceDataSource: Fetching initial data...");
      fetchSettings();
      fetchTodaysEntries();
      // Fetch initial week based on the current state value
      fetchWeeklyExpenses(currentReportWeekStart);
    } else if (!isAuthLoading && !token) {
      // Clear all data on logout
      console.log("FinanceDataSource: Clearing data on logout");
      setSettings(null);
      setTodaysExpenses([]);
      setWeeklyExpensesData([]);
      setIsLoadingSettings(false);
      setIsLoadingEntries(false);
      setIsLoadingWeeklyEntries(false);
      setError(null);
      // DO NOT reset currentReportWeekStart here to avoid potential loops
      // setCurrentReportWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
    }
  }, [
    isAuthLoading,
    token,
    fetchSettings,
    fetchTodaysEntries,
    fetchWeeklyExpenses,
    // currentReportWeekStart was removed previously, keep it removed
  ]);

  // --- Effect to fetch weekly data when week changes ---
  // Separate effect specifically for week changes
  useEffect(() => {
    // Only fetch if logged in
    if (!isAuthLoading && token) {
      console.log(
        "FinanceDataSource: Week changed, fetching weekly expenses for:",
        currentReportWeekStart
      );
      fetchWeeklyExpenses(currentReportWeekStart);
    }
  }, [currentReportWeekStart, token, isAuthLoading, fetchWeeklyExpenses]); // Depend on week start and auth

  // --- Action Functions ---

  // Update addExpense signature and body
  const addExpense = useCallback(
    async (
      amount: number,
      description?: string | null,
      entryDate?: string | null // Add optional date
    ): Promise<boolean> => {
      if (!token) {
        setError("Authentication required to add expense.");
        return false;
      }
      try {
        const body: {
          amount: number;
          description: string | null;
          entry_date?: string; // Make date optional in body
        } = {
          amount,
          description: description || null,
        };
        // Only include entry_date if it's provided
        if (entryDate) {
          body.entry_date = entryDate;
        }

        const response = await fetch("/api/finance/entries", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(body), // Send updated body
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `Failed to add expense: ${response.statusText}`
          );
        }

        // Determine if the added expense affects today's or the current report week's data
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
        });
        return true;
      } catch (err) {
        console.error("Error adding expense:", err);
        const message =
          err instanceof Error ? err.message : "Failed to add expense";
        setError(message);
        showToast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      token,
      fetchTodaysEntries,
      fetchWeeklyExpenses,
      currentReportWeekStart,
      showToast,
    ]
  );

  const deleteExpense = useCallback(
    async (entryId: string): Promise<boolean> => {
      if (!token) {
        setError("Authentication required to delete expense.");
        return false;
      }
      const originalExpenses = [...todaysExpenses];
      // Find the entry being deleted to check its date
      const entryToDelete = todaysExpenses.find(
        (entry) => entry.id === entryId
      );

      // Optimistic UI updates
      setTodaysExpenses((prev) => prev.filter((entry) => entry.id !== entryId));

      try {
        const response = await fetch(`/api/finance/entries/${entryId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          setTodaysExpenses(originalExpenses); // Revert
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message ||
              `Failed to delete expense: ${response.status} ${response.statusText}`
          );
        }

        const deletedDateStr = entryToDelete?.entry_date; // Date of the deleted entry
        const weekStartStr = format(currentReportWeekStart, "yyyy-MM-dd");
        const weekEndStr = format(
          endOfWeek(currentReportWeekStart, { weekStartsOn: 1 }),
          "yyyy-MM-dd"
        );

        const fetchesToRun = [];
        // No need to refetch today's as optimistic update handles it
        // if (deletedDateStr === todayStr) {
        //     fetchesToRun.push(fetchTodaysEntries());
        // }
        if (
          deletedDateStr &&
          deletedDateStr >= weekStartStr &&
          deletedDateStr <= weekEndStr
        ) {
          fetchesToRun.push(fetchWeeklyExpenses(currentReportWeekStart));
        }
        if (fetchesToRun.length > 0) {
          await Promise.all(fetchesToRun);
        }

        showToast({ title: "Expense Deleted" });
        return true;
      } catch (err) {
        console.error("Error deleting expense:", err);
        setTodaysExpenses(originalExpenses); // Ensure revert on error
        // Refetch weekly data on error as well to be safe
        await fetchWeeklyExpenses(currentReportWeekStart);
        const message =
          err instanceof Error ? err.message : "Failed to delete expense";
        setError(message);
        showToast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      }
    },
    [
      token,
      todaysExpenses, // Need this for optimistic revert and getting date
      fetchWeeklyExpenses,
      currentReportWeekStart,
      showToast,
    ]
  );

  const updateSettings = useCallback(
    async (
      newSettings: Partial<Omit<FinanceSettings, "current_balance">>
    ): Promise<boolean> => {
      // ... (updateSettings implementation remains the same) ...
      if (!token) {
        setError("Authentication required to update settings.");
        return false;
      }
      setIsLoadingSettings(true);
      try {
        const response = await fetch("/api/finance/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(newSettings),
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.message ||
              `Failed to update settings: ${response.statusText}`
          );
        }
        const updatedSettings: FinanceSettings = await response.json();
        const { current_balance: _current_balance, ...relevantSettings } =
          updatedSettings;
        setSettings(relevantSettings);
        showToast({ title: "Finance Settings Updated" });
        return true;
      } catch (err) {
        console.error("Error updating finance settings:", err);
        const message =
          err instanceof Error ? err.message : "Failed to update settings";
        setError(message);
        showToast({
          title: "Error",
          description: message,
          variant: "destructive",
        });
        return false;
      } finally {
        setIsLoadingSettings(false);
      }
    },
    [token, showToast]
  );

  // --- Week Navigation Functions ---
  // These now only update the state, the new useEffect handles the fetch
  const goToPreviousWeek = useCallback(() => {
    const previousWeekStart = subWeeks(currentReportWeekStart, 1);
    setCurrentReportWeekStart(previousWeekStart);
  }, [currentReportWeekStart]);

  const goToNextWeek = useCallback(() => {
    const nextWeekStart = addWeeks(currentReportWeekStart, 1);
    setCurrentReportWeekStart(nextWeekStart);
  }, [currentReportWeekStart]);

  const goToCurrentWeek = useCallback(() => {
    const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    if (currentWeekStart.getTime() !== currentReportWeekStart.getTime()) {
      setCurrentReportWeekStart(currentWeekStart);
    }
  }, [currentReportWeekStart]);

  // --- Context Value ---
  // Define remainingToday here so it's available for the context value
  const calculatedRemainingToday = useMemo(() => {
    if (
      settings?.daily_allowance_goal === null ||
      settings?.daily_allowance_goal === undefined
    ) {
      return null; // No goal set
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
      remainingToday: calculatedRemainingToday, // Use the calculated value
      isLoadingSettings,
      isLoadingEntries,
      error,
      addExpense,
      deleteExpense,
      updateSettings,
      // Add weekly report state and functions
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
      calculatedRemainingToday, // Use calculated value in dependency array
      isLoadingSettings,
      isLoadingEntries,
      error,
      addExpense,
      deleteExpense,
      updateSettings,
      // Add dependencies
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
