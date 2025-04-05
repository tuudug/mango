import { useHabits } from "@/contexts/HabitsContext";
import dayjs from "dayjs";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CalendarHeatmap, {
  ReactCalendarHeatmapValue,
  TooltipDataAttrs, // Keep the import for casting
} from "react-calendar-heatmap"; // Import the value type
import "react-calendar-heatmap/dist/styles.css"; // Import default styles
import { Tooltip as ReactTooltip } from "react-tooltip"; // Use renamed import for clarity
import "./HabitHeatmapWidget.css"; // We'll create this for custom styles

// Define the props your widget expects, including config
interface WidgetProps {
  id: string;
  w: number;
  h: number;
  config?: { habitId?: string }; // Add config prop
}

interface HeatmapValue {
  date: string; // YYYY-MM-DD
  count: number; // How many times logged (for multiple_daily) or 1/0 (for once_daily)
}

export function HabitHeatmapWidget({ id, w: _w, h: _h, config }: WidgetProps) {
  // Destructure config
  const { habits, fetchHabitEntries, isLoadingHabits } = useHabits();
  const [heatmapData, setHeatmapData] = useState<HeatmapValue[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read selectedHabitId directly from the config prop
  const selectedHabitId = config?.habitId;

  // Find the selected habit object based on ID (memoized)
  const selectedHabit = useMemo(() => {
    // --- Add Logging ---
    console.log(
      `[HabitHeatmapWidget ${id}] useMemo selectedHabit running. selectedHabitId: ${selectedHabitId}, isLoadingHabits: ${isLoadingHabits}`
    );
    // --- End Logging ---
    if (!selectedHabitId || isLoadingHabits || !habits) {
      return null;
    }
    const habit = habits.find((h) => h.id === selectedHabitId);
    if (!habit) {
      console.warn(
        `[HabitHeatmapWidget ${id}]: Configured habitId ${selectedHabitId} not found in loaded habits.`
      );
    }
    return habit || null;
  }, [habits, selectedHabitId, isLoadingHabits, id]); // Added id for logging uniqueness

  // Fetch data when the selected habit ID changes (or habits load)
  useEffect(() => {
    // --- Add Logging ---
    console.log(
      `[HabitHeatmapWidget ${id}] useEffect fetch data running. selectedHabitId: ${selectedHabitId}, isLoadingHabits: ${isLoadingHabits}`
    );
    // --- End Logging ---

    // Don't fetch if habits are loading or no ID is selected
    if (isLoadingHabits || !selectedHabitId) {
      console.log(
        `[HabitHeatmapWidget ${id}] Skipping fetch: isLoadingHabits=${isLoadingHabits}, selectedHabitId=${selectedHabitId}`
      );
      setHeatmapData([]); // Clear data
      setError(null); // Clear error
      setIsLoadingData(false); // Ensure loading is off if no ID
      return;
    }

    // Find the habit again here just before fetching to ensure it exists
    const habitToFetch = habits.find((h) => h.id === selectedHabitId);

    if (!habitToFetch) {
      // Habit ID is set in config, but habit not found (maybe deleted?)
      console.warn(
        `[HabitHeatmapWidget ${id}]: Habit ${selectedHabitId} not found during fetch trigger. Clearing data.`
      );
      setHeatmapData([]);
      setError(null); // Don't show error, just show "Select Habit" state
      setIsLoadingData(false); // Ensure loading is off
      return;
    }

    console.log(
      `[HabitHeatmapWidget ${id}] Found habit to fetch: ${habitToFetch.name}. Starting loadData.`
    );
    const loadData = async () => {
      setIsLoadingData(true);
      setError(null);
      const endDate = dayjs();
      const startDate = endDate.subtract(1, "year").add(1, "day"); // Approx last year

      try {
        // Use selectedHabitId directly
        console.log(
          `[HabitHeatmapWidget ${id}] Calling fetchHabitEntries for ${selectedHabitId}`
        );
        const entries = await fetchHabitEntries(
          startDate.format("YYYY-MM-DD"),
          endDate.format("YYYY-MM-DD"),
          selectedHabitId // Use the ID from props
        );
        console.log(
          `[HabitHeatmapWidget ${id}] Received ${entries.length} entries.`
        );

        // Process entries into heatmap format
        const data: HeatmapValue[] = [];
        const entriesByDate: Record<string, number> = {};

        entries.forEach((entry) => {
          if (entry.completed) {
            // Only count completed entries
            entriesByDate[entry.entry_date] =
              (entriesByDate[entry.entry_date] || 0) + 1;
          }
        });

        // Create heatmap values
        let currentDate = startDate;
        while (
          currentDate.isBefore(endDate) ||
          currentDate.isSame(endDate, "day")
        ) {
          const dateStr = currentDate.format("YYYY-MM-DD");
          data.push({
            date: dateStr,
            count: entriesByDate[dateStr] || 0,
          });
          currentDate = currentDate.add(1, "day");
        }

        setHeatmapData(data);
        console.log(
          `[HabitHeatmapWidget ${id}] Processed ${data.length} heatmap values.`
        );
      } catch (err) {
        console.error(`[HabitHeatmapWidget ${id}] Error fetching data:`, err);
        setError("Failed to load habit data.");
        setHeatmapData([]);
      } finally {
        setIsLoadingData(false);
      }
    };

    loadData();
    // Restore dependencies: selectedHabitId, habits, isLoadingHabits, fetchHabitEntries
  }, [selectedHabitId, habits, isLoadingHabits, fetchHabitEntries, id]); // Added id for logging uniqueness

  const endDate = dayjs().format("YYYY-MM-DD");
  const startDate = dayjs()
    .subtract(1, "year")
    .add(1, "day")
    .format("YYYY-MM-DD");

  // Adjust function signature and explicitly cast return type
  const getTooltipDataAttrs = (
    value: ReactCalendarHeatmapValue<string> | undefined
  ): TooltipDataAttrs => {
    // Explicitly type the return value
    const heatmapValue = value as HeatmapValue | undefined;
    let text = ""; // Default to empty string

    if (heatmapValue && heatmapValue.date) {
      const dateFormatted = dayjs(heatmapValue.date).format("MMM D, YYYY");
      if (heatmapValue.count > 0) {
        text = `${dateFormatted}: ${heatmapValue.count} ${
          heatmapValue.count > 1 ? "entries" : "entry"
        }`;
      } else {
        text = `${dateFormatted}: No entries`;
      }
    }

    // Return the object structure needed by react-tooltip, but cast it
    // to TooltipDataAttrs to satisfy the heatmap prop type.
    return {
      "data-tooltip-id": "heatmap-tooltip",
      "data-tooltip-content": text,
    } as TooltipDataAttrs; // Cast the return object
  };

  // Adjust function signature to accept ReactCalendarHeatmapValue<string> | undefined
  const getClassForValue = (
    value: ReactCalendarHeatmapValue<string> | undefined
  ): string => {
    const heatmapValue = value as HeatmapValue | undefined; // Cast to our type

    if (!heatmapValue || heatmapValue.count === 0) {
      return "color-empty";
    }
    if (heatmapValue.count <= 1) {
      return "color-scale-1";
    }
    if (heatmapValue.count <= 3) {
      return "color-scale-2";
    }
    if (heatmapValue.count <= 5) {
      return "color-scale-3";
    }
    return "color-scale-4"; // For > 5 entries
  };

  // Determine display state based on loading states and selectedHabit object
  const showLoading = isLoadingData || isLoadingHabits;
  const showSelectHabitMessage = !showLoading && !selectedHabit;
  const showError = !showLoading && !!error;
  const showHeatmap = !showLoading && !showError && !!selectedHabit;

  return (
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-base font-semibold mb-2 truncate">
        Habit Heatmap:{" "}
        {selectedHabit
          ? selectedHabit.name
          : showLoading
          ? "Loading..."
          : "Select Habit"}
        {/* Edit button handled by DashboardGridItem */}
      </h2>
      {showLoading && (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <Loader2 className="animate-spin mr-2" size={18} /> Loading...
        </div>
      )}
      {showSelectHabitMessage && (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm text-center px-2">
          Please configure this widget using the edit (pencil) icon in the
          header to select a habit.
        </div>
      )}
      {showError && (
        <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
          Error: {error}
        </div>
      )}
      {showHeatmap && (
        <div className="flex-1 overflow-hidden relative">
          {/* Use a container to allow heatmap to potentially overflow if needed */}
          <div className="absolute inset-0 overflow-auto pr-2">
            <CalendarHeatmap
              startDate={startDate}
              endDate={endDate}
              values={heatmapData} // Pass our processed data
              classForValue={getClassForValue} // Pass adjusted function
              tooltipDataAttrs={getTooltipDataAttrs} // Pass adjusted function
              showWeekdayLabels={true}
              weekdayLabels={["S", "M", "T", "W", "T", "F", "S"]}
            />
            {/* Remove the 'effect' prop */}
            <ReactTooltip id="heatmap-tooltip" place="top" />
          </div>
        </div>
      )}
    </div>
  );
}
