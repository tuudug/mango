import React from "react";
import { Draggable } from "./Draggable";
import {
  WidgetGroup,
  availableWidgets,
  widgetMetadata,
  WidgetType,
  defaultWidgetLayouts, // Import default layouts for minW check
} from "@/lib/dashboardConfig";
import {
  X,
  HeartPulse,
  ListChecks,
  CalendarDays,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Define props interface
interface WidgetToolboxProps {
  onClose: () => void;
  editTargetDashboard: string; // Add the new prop
}

// Helper function to group widgets
const groupWidgets = (
  widgets: WidgetType[]
): Record<WidgetGroup, WidgetType[]> => {
  const grouped: Record<WidgetGroup, WidgetType[]> = {
    Tracking: [],
    Productivity: [],
    Calendar: [],
    Other: [],
  };
  widgets.forEach((widgetType) => {
    const group = widgetMetadata[widgetType]?.group || "Other";
    grouped[group]?.push(widgetType);
  });
  Object.keys(grouped).forEach((key) => {
    if (grouped[key as WidgetGroup].length === 0) {
      delete grouped[key as WidgetGroup];
    }
  });
  return grouped;
};

// Define structure for single or multiple data source indicators
type DataSourceIndicator = {
  icon: React.ElementType;
  tooltip: string;
  color: string;
};

// Mapping for data source icons and tooltips
const dataSourceInfoMap: Partial<
  Record<
    WidgetType,
    DataSourceIndicator | DataSourceIndicator[] // Can be single or array
  >
> = {
  "Steps Tracker": {
    icon: HeartPulse,
    tooltip: "Consumes Health Data Source",
    color: "text-red-400",
  },
  "To-do List": {
    icon: ListChecks,
    tooltip: "Consumes Todos Data Source",
    color: "text-green-400",
  },
  "Month Calendar": {
    icon: CalendarDays,
    tooltip: "Consumes Calendar Data Source",
    color: "text-blue-400",
  },
  "Daily Calendar": {
    icon: CalendarDays,
    tooltip: "Consumes Calendar Data Source",
    color: "text-blue-400",
  },
  "Daily Summary": [
    {
      icon: CalendarDays,
      tooltip: "Calendar Data",
      color: "text-blue-400",
    },
    {
      icon: ListChecks,
      tooltip: "Todos Data",
      color: "text-green-400",
    },
    {
      icon: HeartPulse,
      tooltip: "Health Data",
      color: "text-red-400",
    },
  ],
  "Goal Tracker": {
    icon: AlertTriangle,
    tooltip: "Work in progress",
    color: "text-yellow-400",
  },
  "Habit Graph": {
    icon: AlertTriangle,
    tooltip: "Work in progress",
    color: "text-yellow-400",
  },
  "Sleep/Step": {
    icon: AlertTriangle,
    tooltip: "Work in progress",
    color: "text-yellow-400",
  },
  Journal: {
    icon: AlertTriangle,
    tooltip: "Data saved locally only",
    color: "text-yellow-400",
  },
};

export function WidgetToolbox({
  onClose,
  editTargetDashboard, // Destructure the prop
}: WidgetToolboxProps) {
  // Filter available widgets based on the edit target
  const filteredAvailableWidgets =
    editTargetDashboard === "mobile"
      ? availableWidgets.filter((widgetType) => {
          const minW = defaultWidgetLayouts[widgetType]?.minW ?? 0;
          return minW <= 4; // Only include if minW is 4 or less
        })
      : availableWidgets; // Show all for default/desktop

  const groupedWidgets = groupWidgets(filteredAvailableWidgets);
  const groupOrder: WidgetGroup[] = [
    "Tracking",
    "Productivity",
    "Calendar",
    "Other",
  ];

  return (
    <aside className="h-full w-64 bg-gray-800 border-r border-gray-700 shadow-lg overflow-y-auto">
      <TooltipProvider delayDuration={200}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-100">
              Widget Toolbox
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>
          <div className="space-y-4">
            {groupOrder.map((groupName) => {
              const widgetsInGroup = groupedWidgets[groupName];
              if (!widgetsInGroup || widgetsInGroup.length === 0) return null;
              return (
                <div key={groupName}>
                  <h3 className="text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {widgetsInGroup.map((widgetType: WidgetType) => {
                      const dsInfo = dataSourceInfoMap[widgetType];
                      return (
                        <Draggable
                          key={widgetType}
                          id={widgetType}
                          data={{ type: "toolbox-item", widgetType }}
                        >
                          <div
                            className={`flex items-center gap-2 p-3 border border-gray-700 rounded-lg bg-gray-700 cursor-grab hover:bg-gray-600 hover:border-blue-500 transition-all duration-200 shadow-sm`}
                          >
                            {/* Widget Icon and Name */}
                            <div className="flex items-center gap-2 flex-grow">
                              {React.createElement(
                                widgetMetadata[widgetType].icon,
                                {
                                  className: `w-4 h-4 ${widgetMetadata[
                                    widgetType
                                  ].colorAccentClass.replace(
                                    "border-l-",
                                    "text-"
                                  )}`,
                                }
                              )}
                              <span className="font-medium text-sm text-gray-100">
                                {widgetType}
                              </span>
                            </div>
                            {/* Data Source Indicator(s) */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {dsInfo &&
                                (Array.isArray(dsInfo) ? dsInfo : [dsInfo]).map(
                                  (info, index) => (
                                    <Tooltip key={index}>
                                      <TooltipTrigger asChild>
                                        <div className="p-0.5 rounded bg-gray-600 border border-gray-500 flex items-center justify-center">
                                          {React.createElement(info.icon, {
                                            className: `w-3 h-3 ${info.color}`,
                                          })}
                                        </div>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" align="center">
                                        <p className="text-xs">
                                          {info.tooltip}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                )}
                            </div>
                          </div>
                        </Draggable>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Warning card about client-side storage */}
          <div className="mt-6 p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">
                Widget positions are now saved to your account and synced across
                devices.
              </p>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </aside>
  );
}
