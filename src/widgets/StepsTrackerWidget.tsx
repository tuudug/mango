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

// Removed internal DataPoint interface

export const StepsTrackerWidget: React.FC<StepsTrackerWidgetProps> = ({
  w,
}) => {
  const { stepData } = useHealth(); // Get step data from context
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
      const entry = stepData.find((d) => d.date === dateString);
      days.push({
        date: dayLabel,
        value: entry ? entry.steps : 0,
      });
    }
    return days;
  }, [stepData]);

  // Get today's steps for the mini view
  const todayString = format(today, "yyyy-MM-dd");
  const currentSteps = stepData.find((d) => d.date === todayString)?.steps || 0;

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
      // Changed flex-col to flex-row, adjusted gap
      <div className="p-2 h-full w-full flex flex-row items-center justify-center gap-3">
        {/* Progress Bar Container */}
        <div className="w-12 h-12 relative flex-shrink-0">
          {" "}
          {/* Adjusted size */}
          <CircularProgressbar
            value={percentage}
            strokeWidth={8} // Adjust thickness
            styles={buildStyles({
              // Rotation of path and trail, in number of turns (0-1)
              // rotation: 0.25,
              // Whether to use rounded or flat corners on the ends - can use 'butt' or 'round'
              strokeLinecap: "round",
              // Text size
              // textSize: '16px',
              // How long animation takes to go from one percentage to another, in seconds
              pathTransitionDuration: 0.5,
              // Colors
              pathColor: `rgba(59, 130, 246, ${percentage / 100})`, // Blue, opacity based on percentage
              textColor: "#f88", // Not used as we put icon inside
              trailColor: "#d6d6d6", // Light gray trail
              // backgroundColor: '#3e98c7', // Not needed
            })}
          />
          {/* Icon centered inside */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Footprints className="w-5 h-5 text-blue-500 dark:text-blue-400" />{" "}
            {/* Adjusted icon size */}
          </div>
        </div>
        {/* Text beside */}
        <div className="text-left leading-tight">
          {" "}
          {/* Changed text-center to text-left */}
          <span className="text-lg font-semibold text-gray-700 dark:text-gray-300 block">
            {" "}
            {/* Adjusted font size */}
            {currentSteps.toLocaleString()}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {" "}
            {/* Adjusted font size */}/ {goalSteps.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  // Render Full Graph View
  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      {/* Header */}
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-base">
          Steps Tracker {/* Updated title */}
        </h3>
        <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
          Last 7 Days {/* Updated subtitle */}
        </div>
      </div>
      {/* Graph container - Stretch columns vertically */}
      <div className="flex-1 flex items-stretch space-x-1">
        {last7DaysData.map(
          (
            point,
            index // Use processed data
          ) => (
            // Column container
            <div key={index} className="flex-1 flex flex-col">
              {/* Bar container */}
              <div className="flex-1 w-full relative group flex items-end justify-center">
                {" "}
                {/* Added flex-1, items-end, justify-center */}
                {/* Actual Bar - Height is percentage of this container. Added flex centering for icon. */}
                <div
                  // Conditional styling based on reaching the goal
                  className={`w-full rounded-t transition-all duration-300 flex items-center justify-center ${
                    // Added flex items-center justify-center
                    // w-full ensures bar takes column width
                    point.value >= goalSteps
                      ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-500" // Green if goal met
                      : "bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-500" // Blue otherwise
                  }`}
                  style={{
                    height: `${calculateHeight(point.value)}%`,
                    minHeight: "4px", // Keep min height
                  }}
                >
                  {/* Checkmark for Goal Met - Centered inside the bar */}
                  {point.value >= goalSteps && (
                    <CheckCircle className="w-4 h-4 text-white opacity-80" /> // Removed absolute, increased size, adjusted opacity
                  )}
                </div>
                {/* Tooltip - Positioned relative to the bar container */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                  <div className="bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                    {point.value.toLocaleString()} {/* Added formatting */}
                  </div>
                </div>
              </div>
              {/* X-axis label */}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {point.date} {/* Use formatted date label */}
              </div>
            </div>
          )
        )}
      </div>
      {/* Removed Refresh button and Widget ID display */}
    </div>
  );
};
