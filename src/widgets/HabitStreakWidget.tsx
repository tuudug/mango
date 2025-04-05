import React, { useState, useEffect, useMemo } from "react";
import { useHabits, HabitEntry, Habit } from "@/contexts/HabitsContext";
import dayjs from "dayjs";
import { Loader2, TrendingUp, Medal } from "lucide-react";

// Define the props your widget expects, including config
interface WidgetProps {
  id: string;
  w: number;
  h: number;
  config?: { habitId?: string }; // Add config prop
}

// Helper function to calculate streaks
const calculateStreaks = (
  entries: HabitEntry[]
): { current: number; longest: number } => {
  if (!entries || entries.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort entries by date ascending
  const sortedEntries = [...entries].sort((a, b) =>
    dayjs(a.entry_date).diff(dayjs(b.entry_date))
  );

  let currentStreak = 0;
  let longestStreak = 0;
  let expectedDate = dayjs(sortedEntries[0].entry_date);

  // Check if the most recent entry is today or yesterday to start current streak calculation
  const today = dayjs().format("YYYY-MM-DD");
  const yesterday = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const lastEntryDate = sortedEntries[sortedEntries.length - 1].entry_date;

  let isCurrentStreakActive =
    lastEntryDate === today || lastEntryDate === yesterday;

  for (let i = 0; i < sortedEntries.length; i++) {
    const entryDate = dayjs(sortedEntries[i].entry_date);

    // Check if the entry date matches the expected date in the sequence
    if (entryDate.isSame(expectedDate, "day")) {
      currentStreak++;
    } else if (entryDate.isAfter(expectedDate, "day")) {
      // Gap detected, reset streak
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1; // Start new streak from this entry
    }
    // If entryDate is before expectedDate (e.g., duplicate entry?), ignore and keep expectedDate

    // Update expected date for the next iteration
    expectedDate = entryDate.add(1, "day");
  }

  // Final check for the last calculated streak
  longestStreak = Math.max(longestStreak, currentStreak);

  // If the streak didn't continue up to today/yesterday, the current streak is 0
  if (!isCurrentStreakActive) {
    currentStreak = 0;
  }

  return { current: currentStreak, longest: longestStreak };
};

export function HabitStreakWidget({ id, w: _w, h: _h, config }: WidgetProps) {
  // Destructure config
  const { habits, fetchHabitEntries, isLoadingHabits } = useHabits();
  const [habitEntries, setHabitEntries] = useState<HabitEntry[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  // REMOVED: const [selectedHabit, setSelectedHabit] = useState<Habit | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Read selectedHabitId directly from the config prop
  const selectedHabitId = config?.habitId;

  // Find the selected habit object based on ID (memoized)
  const selectedHabit = useMemo(() => {
    if (!selectedHabitId || isLoadingHabits || !habits) {
      return null;
    }
    const habit = habits.find((h) => h.id === selectedHabitId);
    if (!habit) {
      console.warn(
        `HabitStreakWidget: Configured habitId ${selectedHabitId} not found in loaded habits.`
      );
    }
    return habit || null;
  }, [habits, selectedHabitId, isLoadingHabits]);

  // Fetch data when the selected habit ID changes (or habits load)
  useEffect(() => {
    // Don't fetch if habits are loading or no ID is selected
    if (isLoadingHabits || !selectedHabitId) {
      setHabitEntries([]); // Clear data
      setError(null); // Clear error
      return;
    }

    // Find the habit again here just before fetching to ensure it exists
    const habitToFetch = habits.find((h) => h.id === selectedHabitId);

    if (!habitToFetch) {
      // Habit ID is set in config, but habit not found (maybe deleted?)
      setHabitEntries([]);
      setError(null); // Don't show error, just show "Select Habit" state
      console.warn(
        `HabitStreakWidget: Habit ${selectedHabitId} not found during fetch trigger.`
      );
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      setError(null);
      // Fetch all entries for the habit to calculate streaks accurately
      const endDate = dayjs();
      // Go back far enough, or maybe fetch all? For now, 2 years.
      const startDate = endDate.subtract(2, "year");

      try {
        // Use selectedHabitId directly
        const entries = await fetchHabitEntries(
          startDate.format("YYYY-MM-DD"),
          endDate.format("YYYY-MM-DD"),
          selectedHabitId // Use the ID from props
        );
        // Filter only completed entries for streak calculation
        setHabitEntries(entries.filter((e) => e.completed));
      } catch (err) {
        console.error("Error fetching streak data:", err);
        setError("Failed to load habit data.");
        setHabitEntries([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
    // Depend directly on the ID from props and habit loading state
  }, [selectedHabitId, habits, isLoadingHabits, fetchHabitEntries]);

  // Calculate streaks using useMemo
  const streaks = useMemo(() => calculateStreaks(habitEntries), [habitEntries]);

  // Determine display state based on loading states and selectedHabit object
  const showLoading = isLoadingData || isLoadingHabits;
  const showSelectHabitMessage = !showLoading && !selectedHabit;
  const showError = !showLoading && !!error;
  const showStreaks = !showLoading && !showError && !!selectedHabit;

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
        <div className="flex flex-col items-center gap-4">
          <div className="flex flex-col items-center">
            <TrendingUp className="w-8 h-8 text-blue-400 mb-1" />
            <span className="text-3xl font-bold">{streaks.current}</span>
            <span className="text-xs text-gray-400">Current Streak</span>
          </div>
          <div className="flex flex-col items-center">
            <Medal className="w-8 h-8 text-yellow-400 mb-1" />
            <span className="text-3xl font-bold">{streaks.longest}</span>
            <span className="text-xs text-gray-400">Longest Streak</span>
          </div>
        </div>
      )}
    </div>
  );
}
