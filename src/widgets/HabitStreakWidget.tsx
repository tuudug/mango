import { useDashboardConfig } from "@/contexts/DashboardConfigContext"; // Import the hook
import { HabitEntry, useHabits } from "@/contexts/HabitsContext";
import dayjs from "dayjs";
import { Loader2, Medal, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState } from "react"; // Add useContext if not implicitly used by hook
import { calculateStreaks } from "@/lib/habitUtils"; // Import the utility function

// Define the props your widget expects, including config
interface WidgetProps {
  id: string;
  w: number;
  h: number;
  config?: { habitId?: string }; // Keep config prop for modal initialization
}

// calculateStreaks function is now imported from "@/lib/habitUtils"
export function HabitStreakWidget({ id, w: _w, h: _h }: WidgetProps) {
  // Removed config from props destructuring for internal use
  // Destructure config
  const {
    habits,
    habitEntries: contextHabitEntries, // Rename context entries
    fetchInitialDataIfNeeded, // Get the interval-checking function
    isLoadingHabits,
    isLoadingEntries, // Get entry loading state
  } = useHabits();
  const { widgetConfigs } = useDashboardConfig(); // Consume the widgetConfigs map
  // Remove local habitEntries state
  // Remove local isLoadingData state
  const [streaks, setStreaks] = useState<{ current: number; longest: number }>({
    current: 0,
    longest: 0,
  }); // State to hold calculated streaks
  const [error, setError] = useState<string | null>(null);

  // Get the specific config for this widget instance from the context
  const currentWidgetConfig = widgetConfigs[id];
  const selectedHabitId = currentWidgetConfig?.habitId; // Get habitId from context config

  // Find the selected habit object based on ID (memoized)
  const selectedHabit = useMemo(() => {
    if (!selectedHabitId || isLoadingHabits || !habits) {
      return null;
    }
    const habit = habits.find((h) => h.id === selectedHabitId);
    if (!habit) {
      // Removed console.warn
    }
    return habit || null;
  }, [habits, selectedHabitId, isLoadingHabits]);

  // Effect to trigger data fetch if needed when selected habit changes
  useEffect(() => {
    // Only trigger fetch if a habit is selected and habits are loaded
    if (selectedHabitId && !isLoadingHabits) {
      console.log(
        `[HabitStreakWidget ${id}] Selected habit changed to ${selectedHabitId}, triggering fetchIfNeeded.`
      );
      fetchInitialDataIfNeeded(); // Call the interval-aware fetch function
    }
    // Clear streaks if no habit is selected or habits are loading
    if (!selectedHabitId || isLoadingHabits) {
      setStreaks({ current: 0, longest: 0 });
      setError(null);
    }
  }, [selectedHabitId, fetchInitialDataIfNeeded, isLoadingHabits, id]); // Depend on selected ID and the fetch function

  // Effect to calculate streaks whenever entries change in the context or selected habit changes
  useEffect(() => {
    if (!selectedHabitId || !contextHabitEntries) {
      setStreaks({ current: 0, longest: 0 }); // Clear if no selection or no entries
      return;
    }

    console.log(
      `[HabitStreakWidget ${id}] Processing ${contextHabitEntries.length} entries from context for habit ${selectedHabitId}`
    );
    setError(null); // Clear previous errors before processing

    try {
      // Filter for the selected habit AND completed entries before calculating
      const relevantCompletedEntries = contextHabitEntries.filter(
        (entry) => entry.habit_id === selectedHabitId && entry.completed
      );

      const calculated = calculateStreaks(relevantCompletedEntries);
      setStreaks(calculated);
    } catch (err) {
      console.error(
        `[HabitStreakWidget ${id}] Error processing habit entries for streaks:`,
        err
      );
      setError("Failed to calculate streaks.");
      setStreaks({ current: 0, longest: 0 });
    }
    // Loading state is handled by isLoadingHabits/isLoadingEntries from context now
  }, [contextHabitEntries, selectedHabitId, id]); // Depend on context entries and selected ID

  // Streaks are now calculated in the useEffect above and stored in state

  // --- Refined Display Logic ---
  // Use context loading states directly
  const showLoading = isLoadingHabits || isLoadingEntries;
  // Show select message only if no ID is configured AND we are not initially loading the habits list
  const showSelectHabitMessage = !isLoadingHabits && !selectedHabitId;
  // Show error only if an ID is selected, we are not loading, and an error exists
  const showError = !!selectedHabitId && !showLoading && !!error;
  // Show streaks only if an ID is selected, not loading, no error, and the habit object is resolved
  const showStreaks =
    !!selectedHabitId && !showLoading && !showError && !!selectedHabit;
  // --- End Refined Display Logic ---

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-center">
      <h2 className="text-base font-semibold mb-3 truncate w-full px-2">
        Streaks:{" "}
        {selectedHabit
          ? selectedHabit.name
          : showLoading
          ? "Loading..."
          : "Select Habit"}
        {/* Edit button handled by DashboardGridItem */}
      </h2>

      {showLoading && (
        <div className="flex flex-col items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mb-2" size={24} /> Loading...
        </div>
      )}

      {showSelectHabitMessage && (
        <div className="text-gray-500 text-sm px-4 text-center">
          Please configure this widget using the edit (pencil) icon in the
          header to select a habit.
        </div>
      )}

      {showError && (
        <div className="text-red-400 text-sm px-4">Error: {error}</div>
      )}

      {showStreaks && (
        <div className="flex flex-row justify-around items-start w-full gap-4">
          {" "}
          {/* Changed to horizontal layout */}
          <div className="flex flex-col items-center">
            <TrendingUp className="w-5 h-5 text-blue-400 mb-1" />{" "}
            {/* Reduced icon size */}
            <span className="text-xl font-bold">{streaks.current}</span>{" "}
            {/* Reduced number size */}
            <span className="text-xs text-gray-400">Current Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <Medal className="w-5 h-5 text-yellow-400 mb-1" />{" "}
            {/* Reduced icon size */}
            <span className="text-xl font-bold">{streaks.longest}</span>{" "}
            {/* Reduced number size */}
            <span className="text-xs text-gray-400">Longest Streak</span>
          </div>
        </div>
      )}
    </div>
  );
}
