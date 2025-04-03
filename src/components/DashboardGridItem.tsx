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
import TodoListWidget from "../widgets/TodoList/index"; // Updated path
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
        className={`bg-gray-800 rounded-lg shadow-md overflow-hidden w-full h-full border border-gray-700 border-l-4 ${
          metadata.colorAccentClass
        } flex flex-col ${isEditing ? "widget-shake" : ""}`}
      >
        {/* Title Bar */}
        {item.type !== "Placeholder" && (
          <div className="flex items-center justify-between p-1.5 border-b border-gray-700 bg-gray-700/50 cursor-grab">
            {/* Left side: Icon + Title */}
            <div className="flex items-center gap-1.5">
              <IconComponent
                className={`w-3.5 h-3.5 ${metadata.colorAccentClass.replace(
                  "border-l-",
                  "text-"
                )}`}
              />
              <span className="text-xs font-medium text-gray-200 select-none">
                {item.type}
              </span>
            </div>
            {/* Right side: Controls - Conditionally render based on isEditing */}
            {isEditing && (
              <div className="flex items-center gap-1 widget-controls-cancel-drag">
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
