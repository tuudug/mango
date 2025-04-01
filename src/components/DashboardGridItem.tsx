import React from "react";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import {
  GridItem,
  // Mode, // Removed unused import
  WidgetType,
  widgetMetadata,
} from "@/lib/dashboardConfig";
import { X, Pencil } from "lucide-react";

// Widget component imports
import { StepsTrackerWidget } from "../widgets/StepsTrackerWidget"; // Renamed import
import { HabitGraphWidget } from "../widgets/HabitGraphWidget";
import { TodoListWidget } from "../widgets/TodoListWidget";
import { MonthCalendarWidget } from "../widgets/MonthCalendarWidget"; // Renamed import and path
import { DailyCalendarWidget } from "../widgets/DailyCalendarWidget"; // New import
import { SleepStepWidget } from "../widgets/SleepStepWidget";
import { GoalTrackerWidget } from "../widgets/GoalTrackerWidget";
import { JournalWidget } from "../widgets/JournalWidget";
import { PlaceholderWidget } from "../widgets/PlaceholderWidget";
import { DailySummaryWidget } from "../widgets/DailySummaryWidget"; // Import the new widget

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

// Map widget types to their components using the defined props interface
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
  "Daily Summary": DailySummaryWidget, // Add mapping for the new widget
  Placeholder: PlaceholderWidget,
};

export function DashboardGridItem({
  item,
  isEditing, // Use the new prop
  handleDeleteWidget,
}: DashboardGridItemProps) {
  const metadata = widgetMetadata[item.type];
  const IconComponent = metadata.icon;
  const WidgetContentComponent = widgetComponentMap[item.type];

  if (!WidgetContentComponent) {
    return <div>Unknown Widget Type: {item.type}</div>;
  }

  return (
    <WidgetErrorBoundary widgetId={item.id}>
      {/* Main widget container - Apply shake class conditionally */}
      <div
        className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full h-full border border-gray-200 dark:border-gray-700 border-l-4 ${
          metadata.colorAccentClass
        } flex flex-col ${isEditing ? "widget-shake" : ""}`} // Use gray border + thick colored left border, add shake class
      >
        {/* Title Bar */}
        {item.type !== "Placeholder" && ( // No title bar for placeholder
          <div className="flex items-center justify-between p-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 cursor-grab">
            {" "}
            {/* Make title bar draggable handle */}
            {/* Left side: Icon + Title */}
            <div className="flex items-center gap-1.5">
              <IconComponent
                className={`w-3.5 h-3.5 ${metadata.colorAccentClass.replace(
                  "border-l-",
                  "text-"
                )}`}
              />{" "}
              {/* Use accent color for icon */}
              <span className="text-xs font-medium text-gray-700 dark:text-gray-200 select-none">
                {item.type}
              </span>
            </div>
            {/* Right side: Controls - Conditionally render based on isEditing */}
            {isEditing && (
              <div className="flex items-center gap-1 widget-controls-cancel-drag">
                {" "}
                {/* Add cancel class */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    /* TODO: Add edit logic */ alert(`Edit ${item.type}`);
                  }}
                  className="p-0.5 text-gray-700 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400" // Changed text-gray-500 to text-gray-700
                  title="Edit Widget"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWidget(item.id);
                  }}
                  className="p-0.5 text-gray-700 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded focus:outline-none focus:ring-1 focus:ring-red-400" // Changed text-gray-500 to text-gray-700
                  title="Delete Widget"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Widget Content Area */}
        <div className="flex-1 overflow-hidden p-0">
          {" "}
          {/* Let content take remaining space, remove internal padding if widgets handle it */}
          {/* Pass id, w, and h props */}
          <WidgetContentComponent id={item.id} w={item.w} h={item.h} />
        </div>
      </div>
    </WidgetErrorBoundary>
  );
}
