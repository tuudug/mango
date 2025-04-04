import React from "react";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
// Update imports to use widgetConfig.ts
import {
  WidgetType,
  widgetMetadata,
  defaultWidgetLayouts,
} from "@/lib/widgetConfig";
import { GridItem } from "@/lib/dashboardConfig"; // Keep GridItem import
import { X, Pencil, AlertTriangle } from "lucide-react"; // Import AlertTriangle for error
import { Button } from "@/components/ui/button"; // Import Button
import { motion } from "framer-motion"; // Import motion

// Widget component imports
import { StepsTrackerWidget } from "../widgets/StepsTrackerWidget"; // Renamed import
import { HabitGraphWidget } from "../widgets/HabitGraphWidget";
import TodoListWidget from "../widgets/TodoList/index"; // Updated path
import { MonthCalendarWidget } from "../widgets/MonthCalendarWidget"; // Renamed import and path
import { DailyCalendarWidget } from "../widgets/DailyCalendarWidget"; // New import
import { SleepStepWidget } from "../widgets/SleepStepWidget";
import { GoalTrackerWidget } from "../widgets/GoalTrackerWidget";
import { JournalWidget } from "../widgets/JournalWidget";
import { PlaceholderWidget } from "../widgets/PlaceholderWidget";
import { DailySummaryWidget } from "../widgets/DailySummaryWidget"; // Import the new widget
import { DailyAllowanceWidget } from "../widgets/DailyAllowanceWidget"; // Import Daily Allowance widget
import { ExpensesReportWidget } from "../widgets/ExpensesReportWidget"; // Import Expenses Report widget
import { PomodoroWidget } from "../widgets/PomodoroWidget"; // Import Pomodoro Widget
import { AmbienceWidget } from "../widgets/AmbienceWidget"; // Import Ambience Widget
import { AffirmationWidget } from "../widgets/AffirmationWidget"; // Import Affirmation Widget

interface DashboardGridItemProps {
  item: GridItem;
  isEditing: boolean; // Re-added prop to control edit buttons visibility
  handleDeleteWidget: (id: string) => void;
  // Add handleEditWidget later if needed
}

// Define common props for widget components
interface WidgetProps {
  id: string;
  w: number; // Add width
  h: number; // Add height
}

// Map widget types to their components using the defined props interface - Add Affirmation
const widgetComponentMap: Record<
  WidgetType,
  React.ComponentType<WidgetProps>
> = {
  "Steps Tracker": StepsTrackerWidget, // Renamed mapping
  "Habit Graph": HabitGraphWidget,
  "Sleep/Step": SleepStepWidget,
  "Goal Tracker": GoalTrackerWidget,
  "To-do List": TodoListWidget,
  Journal: JournalWidget,
  "Month Calendar": MonthCalendarWidget,
  "Daily Calendar": DailyCalendarWidget,
  "Daily Summary": DailySummaryWidget,
  "Daily Allowance": DailyAllowanceWidget, // Corrected key with space
  "Expenses Report": ExpensesReportWidget, // Corrected key with space
  Pomodoro: PomodoroWidget, // Renamed key
  Ambience: AmbienceWidget, // Renamed key
  "Affirmation Widget": AffirmationWidget, // Add Affirmation Widget mapping
  Placeholder: PlaceholderWidget,
};

export function DashboardGridItem({
  item,
  isEditing, // Use the new prop
  handleDeleteWidget,
}: DashboardGridItemProps) {
  const metadata = widgetMetadata[item.type as WidgetType]; // Cast type here for safety
  const WidgetContentComponent = widgetComponentMap[item.type as WidgetType]; // Cast type here

  // --- Error Handling for Missing Component or Metadata ---
  if (!WidgetContentComponent || !metadata) {
    const errorType = !WidgetContentComponent ? "Component" : "Metadata";
    console.error(
      `Error rendering widget: ${errorType} not found for type: ${item.type}`
    );
    // Use default layout for placeholder size calculation in error state
    const errorLayout = defaultWidgetLayouts["Placeholder"] ?? { w: 6, h: 4 };
    return (
      // Added relative positioning for the delete button
      <div
        className="relative bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-200 flex flex-col items-center justify-center text-center h-full"
        style={{
          minWidth: `${errorLayout.w * 20}px`,
          minHeight: `${errorLayout.h * 20}px`,
        }} // Basic min size
      >
        {/* Delete button for error state, only shown in edit mode */}
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation(); // Prevent grid drag/resize
              handleDeleteWidget(item.id);
            }}
            className="absolute top-1 right-1 p-0.5 h-5 w-5 text-red-300 hover:text-red-100 hover:bg-red-700/50 rounded"
            title="Delete Invalid Widget"
          >
            <X size={14} />
          </Button>
        )}
        <AlertTriangle className="w-6 h-6 mb-1" />
        <p className="text-xs font-semibold">Error: Unknown Widget Type</p>
        {/* Use backticks to avoid quote escaping issues */}
        <p className="text-[10px]">{`'${item.type}'`}</p>
      </div>
    );
  }
  // --- End Error Handling ---

  const IconComponent = metadata.icon; // Safe to access now

  // Check if in development mode using Vite's env variable
  const isDevMode = import.meta.env.DEV;

  // Animation props for the content
  const contentAnimationProps = {
    initial: { opacity: 0, y: 10 }, // Start slightly down and invisible
    animate: { opacity: 1, y: 0 }, // Fade in and move up
    transition: { duration: 0.3, ease: "easeOut", delay: 0.1 }, // Add a slight delay
  };

  return (
    // Pass widgetId to WidgetErrorBoundary
    <WidgetErrorBoundary widgetId={item.id}>
      {/* Main widget container - Apply shake class conditionally */}
      <div
        className={`bg-gray-800 rounded-lg shadow-md overflow-hidden w-full h-full border border-gray-700 border-l-4 ${
          metadata.colorAccentClass
        } flex flex-col ${isEditing ? "widget-shake" : ""}`}
      >
        {/* Title Bar */}
        {item.type !== "Placeholder" && (
          <div className="flex items-center justify-between p-1.5 border-b border-gray-700 bg-gray-700/50 cursor-grab">
            {/* Left side: Icon + Title + Dev Coords */}
            <div className="flex items-center gap-1.5 overflow-hidden">
              {" "}
              {/* Added overflow-hidden */}
              <IconComponent
                className={`w-3.5 h-3.5 flex-shrink-0 ${metadata.colorAccentClass.replace(
                  // Added flex-shrink-0
                  "border-l-",
                  "text-"
                )}`}
              />
              <span className="text-xs font-medium text-gray-200 select-none truncate">
                {" "}
                {/* Added truncate */}
                {item.type}
              </span>
              {/* Display coordinates only in development mode */}
              {isDevMode && (
                <span className="text-[10px] text-gray-500 select-none ml-1 whitespace-nowrap">
                  (x:{item.x}, y:{item.y}, w:{item.w}, h:{item.h})
                </span>
              )}
            </div>
            {/* Right side: Controls - Conditionally render based on isEditing */}
            {isEditing && (
              <div className="flex items-center gap-1 widget-controls-cancel-drag flex-shrink-0">
                {" "}
                {/* Added flex-shrink-0 */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    /* TODO: Add edit logic */ alert(`Edit ${item.type}`);
                  }}
                  className="p-0.5 text-gray-400 hover:text-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title="Edit Widget"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWidget(item.id);
                  }}
                  className="p-0.5 text-gray-400 hover:text-red-400 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                  title="Delete Widget"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Widget Content Area - Wrapped with motion.div */}
        <motion.div
          className="flex-1 overflow-hidden p-0" // Apply original classes here
          {...contentAnimationProps} // Apply animation
        >
          {/* Pass id, w, and h props */}
          <WidgetContentComponent id={item.id} w={item.w} h={item.h} />
        </motion.div>
      </div>
    </WidgetErrorBoundary>
  );
}
