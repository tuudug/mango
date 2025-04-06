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
  const { habits, fetchHabitEntries, isLoadingHabits } = useHabits();
  const { widgetConfigs } = useDashboardConfig();
  const [processedEntries, setProcessedEntries] = useState<
    Record<string, ProcessedEntry>
  >({});
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentWidgetConfig = widgetConfigs[id];
  const selectedHabitId = currentWidgetConfig?.habitId;

  const selectedHabit = useMemo(() => {
    if (!selectedHabitId || isLoadingHabits || !habits) return null;
    return habits.find((h) => h.id === selectedHabitId) || null;
  }, [habits, selectedHabitId, isLoadingHabits]);

  // Fetch and process data
  useEffect(() => {
    if (isLoadingHabits || !selectedHabitId) {
      setProcessedEntries({});
      setError(null);
      setIsLoadingData(false);
      return;
    }

    const habitToFetch = habits.find((h) => h.id === selectedHabitId);
    if (!habitToFetch) {
      setProcessedEntries({});
      setError(null);
      setIsLoadingData(false);
      return;
    }

    const loadData = async () => {
      setIsLoadingData(true);
      setError(null);
      const endDate = dayjs();
      const startDate = endDate.subtract(29, "days"); // Fetch last 30 days

      try {
        const entries = await fetchHabitEntries(
          startDate.format("YYYY-MM-DD"),
          endDate.format("YYYY-MM-DD"),
          selectedHabitId
        );

        const entriesMap: Record<string, ProcessedEntry> = {};
        entries.forEach((entry) => {
          const dateStr = entry.entry_date;
          if (!entriesMap[dateStr]) {
            entriesMap[dateStr] = { date: dateStr, completed: false, count: 0 };
          }
          if (entry.completed) {
            entriesMap[dateStr].completed = true;
            entriesMap[dateStr].count += 1;
          }
        });
        setProcessedEntries(entriesMap);
      } catch (err) {
        console.error(`[HabitHeatmapWidget ${id}] Error fetching data:`, err);
        setError("Failed to load habit data.");
        setProcessedEntries({});
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
  }, [selectedHabitId, habits, isLoadingHabits, fetchHabitEntries, id]);

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
  const showLoading = isLoadingData || isLoadingHabits;
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
