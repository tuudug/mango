import React, { useState } from "react"; // Import useEffect
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
// Update imports to use widgetConfig.ts
import { Button } from "@/components/ui/button"; // Import Button
import { GridItem } from "@/lib/dashboardConfig"; // Keep GridItem import
import {
  WidgetType,
  defaultWidgetLayouts,
  widgetMetadata,
} from "@/lib/widgetConfig";
import { motion } from "framer-motion"; // Import motion
import { AlertTriangle, Pencil, X } from "lucide-react"; // Import AlertTriangle for error
import { useDashboardLayout } from "./dashboard/hooks/useDashboardLayout"; // Import the hook
import { DashboardName } from "./dashboard/types"; // Import DashboardName type
import { WidgetConfigModal } from "./WidgetConfigModal"; // Import the new central modal

// Widget component imports (remain the same)
import { AffirmationWidget } from "../widgets/AffirmationWidget";
import { AmbienceWidget } from "../widgets/AmbienceWidget";
import { DailyAllowanceWidget } from "../widgets/DailyAllowanceWidget";
import { DailyCalendarWidget } from "../widgets/DailyCalendarWidget";
import { DailySummaryWidget } from "../widgets/DailySummaryWidget";
import { ExpensesReportWidget } from "../widgets/ExpensesReportWidget";
import { GoalTrackerWidget } from "../widgets/GoalTrackerWidget";
import { HabitGraphWidget } from "../widgets/HabitGraphWidget";
import { HabitHeatmapWidget } from "../widgets/HabitHeatmapWidget";
import { HabitsListWidget } from "../widgets/HabitsListWidget";
import { HabitStreakWidget } from "../widgets/HabitStreakWidget";
import { JournalWidget } from "../widgets/JournalWidget";
import { MonthCalendarWidget } from "../widgets/MonthCalendarWidget";
import { PlaceholderWidget } from "../widgets/PlaceholderWidget";
import { PomodoroWidget } from "../widgets/PomodoroWidget";
import { SleepStepWidget } from "../widgets/SleepStepWidget";
import { StepsTrackerWidget } from "../widgets/StepsTrackerWidget";

import { TextDisplayWidget } from "../widgets/TextDisplayWidget"; // Import the new widget
import { ActiveQuestsSummaryWidget } from "../widgets/ActiveQuestsSummaryWidget";
import { WeightTrackerWidget } from "../widgets/WeightTrackerWidget"; // Import Weight Tracker
import TodoListWidget from "../widgets/TodoList/index";

// --- Update Props Interface ---
interface DashboardGridItemProps {
  item: GridItem;
  items: GridItem[]; // The array this item belongs to (either display items or edit items)
  isEditing: boolean;
  handleDeleteWidget: (id: string) => void;
  editTargetDashboard: DashboardName;
  onConfigModalToggle: (isOpen: boolean) => void; // Add callback prop
}

// Define common props for widget components including optional config
interface WidgetProps {
  id: string;
  w: number; // Add width
  h: number; // Add height
  config?: GridItem["config"]; // Use GridItem['config'] type
}

// Map widget types to their components using the defined props interface
const widgetComponentMap: Record<
  WidgetType,
  React.ComponentType<WidgetProps> // Ensure components accept WidgetProps
> = {
  "Steps Tracker": StepsTrackerWidget,
  "Habit Graph": HabitGraphWidget,
  "Sleep/Step": SleepStepWidget,
  "Goal Tracker": GoalTrackerWidget,
  "To-do List": TodoListWidget,
  Journal: JournalWidget,
  "Month Calendar": MonthCalendarWidget,
  "Daily Calendar": DailyCalendarWidget,
  "Daily Summary": DailySummaryWidget,
  "Daily Allowance": DailyAllowanceWidget,
  "Expenses Report": ExpensesReportWidget,
  Pomodoro: PomodoroWidget,
  Ambience: AmbienceWidget,
  "Affirmation Widget": AffirmationWidget,
  "Habits Checklist": HabitsListWidget,
  "Habit Heatmap": HabitHeatmapWidget,
  "Habit Streaks": HabitStreakWidget,
  "Text Display": TextDisplayWidget, // Add the new widget mapping
  "Active Quests Summary": ActiveQuestsSummaryWidget,
  "Weight Tracker": WeightTrackerWidget, // Add Weight Tracker mapping
  Placeholder: PlaceholderWidget,
};

export function DashboardGridItem({
  item,
  items: _items, // Destructure the items array prop
  isEditing,
  handleDeleteWidget,
  editTargetDashboard,
  onConfigModalToggle, // Destructure new prop
}: DashboardGridItemProps) {
  // Get renamed updateLayoutAndConfig from the hook
  const { updateLayoutAndConfig } = useDashboardLayout();
  // State for the new central config modal
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  const metadata = widgetMetadata[item.type as WidgetType];
  const WidgetContentComponent = widgetComponentMap[item.type as WidgetType];
  // Check if there's a specific config component registered for this widget type
  //const hasConfigComponent = !!widgetConfigComponents[item.type as WidgetType];

  // --- Error Handling (remains the same) ---
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

  // --- Event Handlers ---
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open the central config modal regardless of whether a specific config exists
    setIsConfigModalOpen(true);
    // Call the callback to notify Dashboard that a modal is open
    onConfigModalToggle(true);
  };

  // This function is passed to WidgetConfigModal's onSave prop
  const handleSaveConfig = (newConfig: GridItem["config"]) => {
    console.log(
      `[DashboardGridItem] handleSaveConfig called for item.id: ${item.id}, newConfig:`,
      newConfig,
      `dashboard: ${editTargetDashboard}, isEditing: ${isEditing}`
    );
    // Call the renamed function without the 'items' argument
    updateLayoutAndConfig(
      item.id,
      newConfig ?? {}, // Ensure newConfig is an object, even if undefined was passed back
      editTargetDashboard,
      // items, // REMOVED
      isEditing // Pass the explicit editing flag
    );
    // Modal closes itself via onOpenChange, which will trigger handleOpenChange below
  };

  // --- NEW: Handle modal open/close state change ---
  const handleOpenChange = (isOpen: boolean) => {
    setIsConfigModalOpen(isOpen);
    // Call the callback to notify Dashboard about the modal state change
    onConfigModalToggle(isOpen);
  };
  // --- End Event Handlers ---

  // Removed console.log

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
                {/* Updated Edit Button */}
                <button
                  onClick={handleEditClick}
                  className="p-0.5 text-gray-400 hover:text-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  title="Configure Widget" // Generic title
                >
                  <Pencil size={12} />
                </button>
                {/* Delete Button remains the same */}
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
              config={item.config} // Pass config down to the actual widget
            />
          </WidgetErrorBoundary>
        </motion.div>
      </div>

      {/* Render the central config modal */}
      <WidgetConfigModal
        isOpen={isConfigModalOpen}
        onOpenChange={handleOpenChange} // Use the new handler
        widgetId={item.id}
        widgetType={item.type as WidgetType} // Cast item.type to WidgetType
        currentConfig={item.config ?? {}} // Provide default empty object if config is undefined
        onSave={handleSaveConfig} // Pass the save handler
      />
    </>
  );
}
