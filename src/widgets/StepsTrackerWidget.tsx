import React from "react"; // Removed useState
import { Footprints, CheckCircle } from "lucide-react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { useHealth } from "@/contexts/HealthContext"; // Import useHealth hook
import { format, subDays } from "date-fns"; // Removed unused date-fns imports

interface StepsTrackerWidgetProps {
  // Renamed interface
  id: string;
  w: number;
  h: number;
}

export const StepsTrackerWidget: React.FC<StepsTrackerWidgetProps> = ({
  w,
}) => {
  // Use healthData and filter for steps
  const { healthData } = useHealth();
  const goalSteps = 10000; // Defined goal

  // --- Process Data from Context ---
  const today = new Date();
  const last7DaysData = React.useMemo(() => {
    const days = [];
    // Get the last 7 days including today
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateString = format(date, "yyyy-MM-dd");
      const dayLabel = format(date, "eee"); // e.g., "Mon"
      // Find the entry for the specific date AND type 'steps'
      const entry = healthData.find(
        (d) => d.entry_date === dateString && d.type === "steps"
      );
      days.push({
        date: dayLabel,
        value: entry ? entry.value : 0, // Use entry.value
      });
    }
    return days;
  }, [healthData]); // Depend on healthData

  // Get today's steps for the mini view
  const todayString = format(today, "yyyy-MM-dd");
  const currentSteps =
    healthData.find((d) => d.entry_date === todayString && d.type === "steps")
      ?.value || 0; // Use entry_date and value

  // Find the max value for scaling the graph
  const maxValue = Math.max(goalSteps, ...last7DaysData.map((d) => d.value));

  // Calculate bar heights as percentages of the max
  const calculateHeight = (value: number) => {
    // Ensure maxValue is not zero to avoid division by zero
    return maxValue > 0 ? (value / maxValue) * 100 : 0;
  };

  // --- Conditional Rendering Logic ---
  const isMiniView = w < 6; // Threshold for mini view
  const percentage = Math.round((currentSteps / goalSteps) * 100);

  if (isMiniView) {
    // Render Mini View with Circular Progress Bar (Horizontal Layout)
    return (
      <div className="p-2 h-full w-full flex flex-row items-center justify-center gap-3">
        {/* Progress Bar Container */}
        <div className="w-12 h-12 relative flex-shrink-0">
          <CircularProgressbar
            value={percentage}
            strokeWidth={8}
            styles={buildStyles({
              strokeLinecap: "round",
              pathTransitionDuration: 0.5,
              pathColor: `rgba(59, 130, 246, ${percentage / 100})`,
              textColor: "#f88",
              trailColor: "#d6d6d6",
            })}
          />
          {/* Icon centered inside */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Footprints className="w-5 h-5 text-blue-400" />
          </div>
        </div>
        {/* Text beside */}
        <div className="text-left leading-tight">
          <span className="text-lg font-semibold text-gray-300 block">
            {currentSteps.toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">
            / {goalSteps.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  // Render Full Graph View
  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-100 text-base">Steps Tracker</h3>
        <div className="text-xs text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">
          Last 7 Days
        </div>
      </div>
      {/* Graph container - Stretch columns vertically */}
      <div className="flex-1 flex items-stretch space-x-1">
        {last7DaysData.map((point, index) => (
          <div key={index} className="flex-1 flex flex-col">
            {/* Bar container */}
            <div className="flex-1 w-full relative group flex items-end justify-center">
              {/* Actual Bar - Height is percentage of this container. Added flex centering for icon. */}
              <div
                className={`w-full rounded-t transition-all duration-300 flex items-center justify-center ${
                  point.value >= goalSteps
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-blue-600 hover:bg-blue-500"
                }`}
                style={{
                  height: `${calculateHeight(point.value)}%`,
                  minHeight: "4px",
                }}
              >
                {point.value >= goalSteps && (
                  <CheckCircle className="w-4 h-4 text-white opacity-80" />
                )}
              </div>
              {/* Tooltip - Positioned relative to the bar container */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {point.value.toLocaleString()}
                </div>
              </div>
            </div>
            {/* X-axis label */}
            <div className="text-xs text-gray-400 mt-0.5">{point.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
