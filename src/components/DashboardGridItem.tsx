import React, { useState } from "react"; // Import useState
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
import { useDashboardLayout } from "./dashboard/hooks/useDashboardLayout"; // Import the hook
import { HabitSelectionModal } from "./dashboard/components/HabitSelectionModal"; // Import the new modal
import { DashboardName } from "./dashboard/types"; // Import DashboardName type

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
import { HabitsListWidget } from "../widgets/HabitsListWidget"; // Import Habits Checklist Widget
import { HabitHeatmapWidget } from "../widgets/HabitHeatmapWidget"; // Import Habit Heatmap Widget
import { HabitStreakWidget } from "../widgets/HabitStreakWidget"; // Import Habit Streak Widget

interface DashboardGridItemProps {
  item: GridItem;
  items: GridItem[]; // The array this item belongs to (either display items or edit items)
  isEditing: boolean;
  handleDeleteWidget: (id: string) => void;
  editTargetDashboard: DashboardName;
}

// Define common props for widget components including optional config
interface WidgetProps {
  id: string;
  w: number; // Add width
  h: number; // Add height
  config?: Record<string, any>; // Add optional config prop
}

// Map widget types to their components using the defined props interface - Add Habit Streaks
const widgetComponentMap: Record<
  WidgetType,
  React.ComponentType<WidgetProps> // Ensure components accept WidgetProps
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
  "Habits Checklist": HabitsListWidget, // Add Habits Checklist mapping
  "Habit Heatmap": HabitHeatmapWidget, // Add Habit Heatmap mapping
  "Habit Streaks": HabitStreakWidget, // Add Habit Streaks mapping
  Placeholder: PlaceholderWidget,
};

export function DashboardGridItem({
  item,
  items, // Destructure the items array prop
  isEditing,
  handleDeleteWidget,
  editTargetDashboard,
}: DashboardGridItemProps) {
  // Get updateWidgetConfig from the hook (it knows whether to update items or editItems)
  const { updateWidgetConfig } = useDashboardLayout();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const metadata = widgetMetadata[item.type as WidgetType];
  const WidgetContentComponent = widgetComponentMap[item.type as WidgetType];

  // --- Error Handling ---
  if (!WidgetContentComponent || !metadata) {
    const errorType = !WidgetContentComponent ? "Component" : "Metadata";
    console.error(
      `Error rendering widget: ${errorType} not found for type: ${item.type}`
    );
    const errorLayout = defaultWidgetLayouts["Placeholder"] ?? { w: 6, h: 4 };
    return (
      <div
        className="relative bg-red-900/50 border border-red-700 rounded-lg p-3 text-red-200 flex flex-col items-center justify-center text-center h-full"
        style={{
          minWidth: `${errorLayout.w * 20}px`,
          minHeight: `${errorLayout.h * 20}px`,
        }}
      >
        {isEditing && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
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
        <p className="text-[10px]">{`'${item.type}'`}</p>
      </div>
    );
  }
  // --- End Error Handling ---

  const IconComponent = metadata.icon;
  const isDevMode = import.meta.env.DEV;

  const contentAnimationProps = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: "easeOut", delay: 0.1 },
  };

  const requiresConfig =
    item.type === "Habit Heatmap" || item.type === "Habit Streaks";

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (requiresConfig) {
      setIsConfigModalOpen(true);
    } else {
      alert(`Edit functionality not implemented for ${item.type}`);
    }
  };

  const handleSelectHabit = (habitId: string) => {
    console.log(
      `[DashboardGridItem] handleSelectHabit called for item.id: ${item.id}, habitId: ${habitId}, dashboard: ${editTargetDashboard}, isEditing: ${isEditing}`
    );
    // Pass the correct layout array (items prop) AND the isEditing flag to updateWidgetConfig
    updateWidgetConfig(
      item.id,
      { habitId: habitId },
      editTargetDashboard,
      items, // Pass the received items array (which is either display items or edit items)
      isEditing // Pass the explicit editing flag
    );
    // Modal closes itself
  };

  return (
    <>
      <div
        className={`bg-gray-800 rounded-lg shadow-md overflow-hidden w-full h-full border border-gray-700 border-l-4 ${
          metadata.colorAccentClass
        } flex flex-col ${isEditing ? "widget-shake" : ""}`}
      >
        {item.type !== "Placeholder" && (
          <div className="flex items-center justify-between p-1.5 border-b border-gray-700 bg-gray-700/50 cursor-grab">
            <div className="flex items-center gap-1.5 overflow-hidden">
              <IconComponent
                className={`w-3.5 h-3.5 flex-shrink-0 ${metadata.colorAccentClass.replace(
                  "border-l-",
                  "text-"
                )}`}
              />
              <span className="text-xs font-medium text-gray-200 select-none truncate">
                {item.type}
              </span>
              {isDevMode && (
                <span className="text-[10px] text-gray-500 select-none ml-1 whitespace-nowrap">
                  (x:{item.x}, y:{item.y}, w:{item.w}, h:{item.h})
                </span>
              )}
            </div>
            {isEditing && (
              <div className="flex items-center gap-1 widget-controls-cancel-drag flex-shrink-0">
                <button
                  onClick={handleEditClick}
                  className="p-0.5 text-gray-400 hover:text-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title={requiresConfig ? "Configure Widget" : "Edit Widget"}
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

        <motion.div
          className="flex-1 overflow-hidden p-0"
          {...contentAnimationProps}
        >
          <WidgetErrorBoundary widgetId={item.id}>
            <WidgetContentComponent
              id={item.id}
              w={item.w}
              h={item.h}
              config={item.config}
            />
          </WidgetErrorBoundary>
        </motion.div>
      </div>

      {requiresConfig && (
        <HabitSelectionModal
          isOpen={isConfigModalOpen}
          onOpenChange={setIsConfigModalOpen}
          onSelectHabit={handleSelectHabit}
          currentHabitId={item.config?.habitId}
          widgetType={item.type}
        />
      )}
    </>
  );
}
