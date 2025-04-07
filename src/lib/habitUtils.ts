import { HabitEntry } from "@/contexts/HabitsContext";
import dayjs from "dayjs";

// Helper function to calculate streaks based on COMPLETED entries
// Assumes input entries are sorted by date and represent days the habit was completed.
export const calculateStreaks = (
  completedEntries: HabitEntry[]
): { current: number; longest: number } => {
  if (!completedEntries || completedEntries.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Ensure entries are sorted by date (caller should ideally do this)
  const sortedEntries = [...completedEntries].sort((a, b) =>
    dayjs(a.entry_date).diff(dayjs(b.entry_date))
  );

  // Deduplicate entries based on date, as we only care if a day was completed, not how many times
  const uniqueDates = new Map<string, dayjs.Dayjs>();
  sortedEntries.forEach((entry) => {
    const dateStr = dayjs(entry.entry_date).format("YYYY-MM-DD");
    if (!uniqueDates.has(dateStr)) {
      uniqueDates.set(dateStr, dayjs(entry.entry_date));
    }
  });
  const uniqueSortedDates = Array.from(uniqueDates.values()).sort((a, b) =>
    a.diff(b)
  );

  if (uniqueSortedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  let currentStreak = 0;
  let longestStreak = 0;
  let lastStreakDate: dayjs.Dayjs | null = null;

  for (const entryDate of uniqueSortedDates) {
    if (lastStreakDate === null) {
      // First day in a potential streak
      currentStreak = 1;
    } else {
      // Check if this day continues the streak (is exactly one day after the last)
      if (entryDate.isSame(lastStreakDate.add(1, "day"), "day")) {
        currentStreak++;
      } else {
        // Gap detected, the previous streak ended. Reset.
        // Longest streak was already updated in the previous iteration's max check
        currentStreak = 1; // Start a new streak from this day
      }
    }
    // Update the date of the last day in the current streak sequence
    lastStreakDate = entryDate;
    // Update longest streak found so far
    longestStreak = Math.max(longestStreak, currentStreak);
  }

  // After the loop, the final 'currentStreak' value is potentially the longest one.
  longestStreak = Math.max(longestStreak, currentStreak);

  // Now, determine if the *current* streak is still active (ends today or yesterday)
  const today = dayjs();
  const yesterday = dayjs().subtract(1, "day");

  if (
    lastStreakDate === null ||
    !(
      lastStreakDate.isSame(today, "day") ||
      lastStreakDate.isSame(yesterday, "day")
    )
  ) {
    // If there were no entries, or the last completed day wasn't today or yesterday, the current streak is broken.
    currentStreak = 0;
  }
  // Otherwise, the currentStreak calculated in the loop is the active current streak.

  return { current: currentStreak, longest: longestStreak };
};
