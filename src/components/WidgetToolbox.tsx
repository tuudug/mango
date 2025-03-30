import React from "react";
import { Draggable } from "./Draggable"; // Adjusted path
import {
  availableWidgets,
  widgetMetadata,
  WidgetType,
} from "@/lib/dashboardConfig"; // Import config

export function WidgetToolbox() {
  return (
    <aside className="absolute top-0 right-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-inner overflow-y-auto transition-all duration-300 transform translate-x-0">
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
          Widget Toolbox
        </h2>
        <div className="space-y-3">
          {availableWidgets.map((widgetType: WidgetType) => (
            <Draggable
              key={widgetType}
              id={widgetType}
              data={{ type: "toolbox-item", widgetType }}
            >
              {/* Add icon and color to toolbox item */}
              <div
                className={`flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-grab hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm`} // Reverted to gray border, added hover effect
              >
                {React.createElement(widgetMetadata[widgetType].icon, {
                  className: `w-4 h-4 ${widgetMetadata[ // Use colorAccentClass
                    widgetType
                  ].colorAccentClass
                    .replace("border-l-", "text-")}`, // Use accent color for icon
                })}
                <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                  {" "}
                  {/* Ensure text is visible */}
                  {widgetType}
                </span>
              </div>
            </Draggable>
          ))}
        </div>
      </div>
    </aside>
  );
}
