import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
// Update imports to use widgetConfig.ts
import { WidgetGroup, WidgetType } from "@/lib/widgetConfig";
import { availableWidgets } from "@/lib/widgetConfig";
import { widgetMetadata } from "@/lib/widgetConfig";
// Removed: import { WidgetType } from "@/lib/dashboardConfig"; // Keep GridItem if needed elsewhere
// Removed: import { defaultWidgetLayouts } from "@/lib/dashboardConfig"; // Keep GridItem if needed elsewhere
import { GripVertical, X } from "lucide-react";
import React from "react";
import { Draggable } from "./Draggable";
import { DashboardName } from "./dashboard/types";

interface WidgetToolboxProps {
  onClose: () => void;
  editTargetDashboard: DashboardName; // Receive edit target
}

// Group widgets by their group metadata
const groupedWidgets = availableWidgets.reduce((acc, widgetType) => {
  const group = widgetMetadata[widgetType].group;
  if (!acc[group]) {
    acc[group] = [];
  }
  acc[group].push(widgetType);
  return acc;
}, {} as Record<WidgetGroup, WidgetType[]>);

// Define the order of groups
const groupOrder: WidgetGroup[] = [
  "Finance",
  "Tracking",
  "Productivity",
  "Calendar",
  "Other",
];

export function WidgetToolbox({
  onClose,
  editTargetDashboard,
}: WidgetToolboxProps) {
  // Filter groups based on edit target
  const filteredGroupOrder =
    editTargetDashboard === "mobile"
      ? groupOrder.filter((group) => group !== "Calendar") // Exclude Calendar group for mobile
      : groupOrder;

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-700 bg-gray-800 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-4">
        <h2 className="text-lg font-semibold">Add Widgets</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X size={16} />
          <span className="sr-only">Close Toolbox</span>
        </Button>
      </div>

      {/* Widget List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {filteredGroupOrder.map((group) => {
            const widgetsInGroup = groupedWidgets[group]?.filter(
              (widgetType) => {
                // Further filter widgets within groups for mobile if needed
                if (editTargetDashboard === "mobile") {
                  // Example: Exclude specific widgets if necessary for mobile
                  // return widgetType !== 'SomeComplexWidget';
                }
                return true; // Keep all widgets in allowed groups by default
              }
            );

            // Only render the group if it has widgets after filtering
            if (!widgetsInGroup || widgetsInGroup.length === 0) {
              return null;
            }

            return (
              <div key={group}>
                <h3 className="mb-3 text-sm font-medium text-gray-400">
                  {group}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  {widgetsInGroup.map((widgetType) => {
                    const metadata = widgetMetadata[widgetType];
                    const Icon = metadata.icon;
                    return (
                      <Draggable
                        key={widgetType}
                        id={widgetType}
                        data={{ type: "toolbox-item" }} // Add type data for dnd context
                      >
                        <div
                          className={cn(
                            "flex cursor-grab items-center gap-3 rounded-md border border-gray-700 bg-gray-700/50 p-3 shadow-sm transition-colors hover:bg-gray-700 active:cursor-grabbing",
                            metadata.colorAccentClass, // Apply accent color
                            "border-l-4" // Ensure left border is thick enough
                          )}
                        >
                          <Icon className="h-5 w-5 flex-shrink-0 text-gray-300" />
                          <span className="flex-1 text-sm font-medium text-gray-100">
                            {widgetType}
                          </span>
                          <GripVertical className="h-5 w-5 flex-shrink-0 text-gray-500" />
                        </div>
                      </Draggable>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
