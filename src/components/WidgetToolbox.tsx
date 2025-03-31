import React from "react";
import { Draggable } from "./Draggable"; // Adjusted path
import { WidgetGroup } from "@/lib/dashboardConfig"; // Import WidgetGroup
import {
  availableWidgets,
  widgetMetadata,
  WidgetType,
} from "@/lib/dashboardConfig"; // Import config
import { X } from "lucide-react";

// Define props interface
interface WidgetToolboxProps {
  onClose: () => void; // Function to close the toolbox
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
    if (grouped[group]) {
      grouped[group].push(widgetType);
    } else {
      // Fallback for safety, though all available should have a group
      grouped["Other"].push(widgetType);
    }
  });

  // Filter out empty groups
  Object.keys(grouped).forEach((key) => {
    if (grouped[key as WidgetGroup].length === 0) {
      delete grouped[key as WidgetGroup];
    }
  });

  return grouped;
};

export function WidgetToolbox({ onClose }: WidgetToolboxProps) {
  // Accept onClose prop
  const groupedWidgets = groupWidgets(availableWidgets);
  const groupOrder: WidgetGroup[] = [
    "Tracking",
    "Productivity",
    "Calendar",
    "Other",
  ]; // Define display order

  return (
    // Removed absolute positioning and transition - these are handled by the wrapper in Dashboard.tsx
    // Added h-full to ensure it fills the wrapper's height
    <aside className="h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg overflow-y-auto">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Widget Toolbox
          </h2>
          {/* Add onClick handler to the close button */}
          <button
            onClick={onClose} // Call onClose when clicked
            className="p-1 text-gray-700 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
            title="Close"
          >
            <X size={14} />
          </button>
        </div>
        <div className="space-y-4">
          {" "}
          {/* Increased spacing between groups */}
          {groupOrder.map((groupName) => {
            const widgetsInGroup = groupedWidgets[groupName];
            if (!widgetsInGroup || widgetsInGroup.length === 0) {
              return null; // Don't render empty groups
            }
            return (
              <div key={groupName}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                  {groupName}
                </h3>
                <div className="space-y-2">
                  {" "}
                  {/* Spacing within group */}
                  {widgetsInGroup.map((widgetType: WidgetType) => (
                    <Draggable
                      key={widgetType}
                      id={widgetType}
                      data={{ type: "toolbox-item", widgetType }}
                    >
                      {/* Add icon and color to toolbox item */}
                      <div
                        className={`flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-grab hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm`}
                      >
                        {React.createElement(widgetMetadata[widgetType].icon, {
                          className: `w-4 h-4 ${widgetMetadata[
                            widgetType
                          ].colorAccentClass.replace("border-l-", "text-")}`, // Use accent color for icon
                        })}
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          {widgetType}
                        </span>
                      </div>
                    </Draggable>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
