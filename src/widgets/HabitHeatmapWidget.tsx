import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Use shadcn tooltip
import { useDashboardConfig } from "@/contexts/DashboardConfigContext";
import { useHabits } from "@/contexts/HabitsContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

// Define the props your widget expects
interface WidgetProps {
  id: string;
  w: number;
  h: number;
  config?: { habitId?: string }; // Keep config prop for modal initialization
}

interface ProcessedEntry {
  date: string; // YYYY-MM-DD
  completed: boolean;
  count: number; // Keep count for potential future use/tooltip
}

export function HabitHeatmapWidget({ id, w: _w, h: _h }: WidgetProps) {
  const {
    habits,
    habitEntries, // Get entries from context
    fetchInitialDataIfNeeded, // Get the interval-checking function
    isLoadingHabits,
    isLoadingEntries, // Get entry loading state
  } = useHabits();
  const { widgetConfigs } = useDashboardConfig();
  const [processedEntries, setProcessedEntries] = useState<
    Record<string, ProcessedEntry>
  >({});
  // isLoadingData is now derived from context loading states
  const [error, setError] = useState<string | null>(null);

  const currentWidgetConfig = widgetConfigs[id];
  const selectedHabitId = currentWidgetConfig?.habitId;

  const selectedHabit = useMemo(() => {
    if (!selectedHabitId || isLoadingHabits || !habits) return null;
    return habits.find((h) => h.id === selectedHabitId) || null;
  }, [habits, selectedHabitId, isLoadingHabits]);

  // Effect to trigger data fetch if needed when selected habit changes
  useEffect(() => {
    // Only trigger fetch if a habit is selected and habits are loaded
    if (selectedHabitId && !isLoadingHabits) {
      console.log(
        `[HabitHeatmapWidget ${id}] Selected habit changed to ${selectedHabitId}, triggering fetchIfNeeded.`
      );
      fetchInitialDataIfNeeded(); // Call the interval-aware fetch function
    }
    // Clear processed data if no habit is selected or habits are loading
    if (!selectedHabitId || isLoadingHabits) {
      setProcessedEntries({});
      setError(null);
    }
  }, [selectedHabitId, fetchInitialDataIfNeeded, isLoadingHabits, id]); // Depend on selected ID and the fetch function

  // Effect to process entries whenever they change in the context or selected habit changes
  useEffect(() => {
    if (!selectedHabitId || !habitEntries) {
      setProcessedEntries({}); // Clear if no selection or no entries
      return;
    }

    console.log(
      `[HabitHeatmapWidget ${id}] Processing ${habitEntries.length} entries from context for habit ${selectedHabitId}`
    );
    setError(null); // Clear previous errors before processing

    try {
      const entriesMap: Record<string, ProcessedEntry> = {};
      const relevantEntries = habitEntries.filter(
        (entry) => entry.habit_id === selectedHabitId
      );

      // Process only the relevant entries for the selected habit
      relevantEntries.forEach((entry) => {
        const dateStr = entry.entry_date;
        if (!entriesMap[dateStr]) {
          entriesMap[dateStr] = { date: dateStr, completed: false, count: 0 };
        }
        // Ensure we only count completed entries towards the count/status
        if (entry.completed) {
          entriesMap[dateStr].completed = true;
          entriesMap[dateStr].count += 1;
        }
      });
      setProcessedEntries(entriesMap);
    } catch (err) {
      console.error(
        `[HabitHeatmapWidget ${id}] Error processing habit entries:`,
        err
      );
      setError("Failed to process habit data.");
      setProcessedEntries({});
    }
    // Loading state is handled by isLoadingHabits/isLoadingEntries from context now
  }, [habitEntries, selectedHabitId, id]); // Depend on context entries and selected ID

  // Generate dates for the last 30 days
  const days = useMemo(() => {
    const result = [];
    const today = dayjs();
    for (let i = 29; i >= 0; i--) {
      result.push(today.subtract(i, "day"));
    }
    return result;
  }, []);

  // Determine display state
  const showLoading = isLoadingHabits || isLoadingEntries; // Use context loading states
  const showSelectHabitMessage = !showLoading && !selectedHabit;
  const showError = !showLoading && !!error;
  const showGrid = !showLoading && !showError && !!selectedHabit;

  const getDayClass = (date: dayjs.Dayjs): string => {
    const dateStr = date.format("YYYY-MM-DD");
    const entry = processedEntries[dateStr];
    if (entry?.completed) {
      // Use Tailwind classes for colors (adjust as needed)
      return "bg-emerald-600 hover:bg-emerald-500"; // Completed
    }
    return "bg-gray-700 hover:bg-gray-600"; // Not completed or no entry
  };

  const getTooltipText = (date: dayjs.Dayjs): string => {
    const dateStr = date.format("YYYY-MM-DD");
    const entry = processedEntries[dateStr];
    const formattedDate = date.format("MMM D, YYYY");
    if (entry?.completed) {
      return `${formattedDate}: Completed (${entry.count} ${
        entry.count > 1 ? "times" : "time"
      })`;
    }
    return `${formattedDate}: Not completed`;
  };

  const todayStr = dayjs().format("YYYY-MM-DD"); // Get today's date string once

  return (
    <div className="p-3 h-full flex flex-col">
      <h2 className="text-sm font-semibold mb-2 truncate text-gray-300">
        Habit Heatmap (Last 30 Days):{" "}
        {selectedHabit
          ? selectedHabit.name
          : showLoading
          ? "Loading..."
          : "Select Habit"}
      </h2>
      {showLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading...
        </div>
      )}
      {showSelectHabitMessage && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs text-center px-2">
          Please configure this widget to select a habit.
        </div>
      )}
      {showError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-xs">
          Error: {error}
        </div>
      )}
      {showGrid && (
        <TooltipProvider delayDuration={150}>
          {/* Use CSS Grid with 7 columns and explicitly define 5 rows */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-1 content-start overflow-hidden py-1">
            {days.map((day) => (
              <Tooltip key={day.format("YYYY-MM-DD")}>
                <TooltipTrigger asChild>
                  {/* Simple square div, let grid handle sizing */}
                  <div
                    className={cn(
                      "rounded-[2px]", // Removed aspect-square
                      getDayClass(day),
                      // Add border if it's today
                      day.format("YYYY-MM-DD") === todayStr &&
                        "border border-blue-400"
                    )}
                    // Removed minWidth style
                  >
                    {/* Can add content inside square if needed */}
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-gray-900 text-white border-gray-700 text-xs p-1 px-2">
                  <p>{getTooltipText(day)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
      )}
    </div>
  );
}
