import React from "react";
import {
  WidgetType,
  defaultWidgetLayouts,
  widgetMetadata,
} from "@/lib/dashboardConfig";

interface WidgetPreviewProps {
  type: WidgetType;
}

export function WidgetPreview({ type }: WidgetPreviewProps) {
  const defaultLayout = defaultWidgetLayouts[type];
  const metadata = widgetMetadata[type]; // Get metadata for the icon
  const style = {
    // Estimate size based on default layout (adjust multipliers as needed)
    width: `${defaultLayout.w * 25}px`, // Example: 25px per grid unit width
    height: `${defaultLayout.h * 25}px`, // Example: 25px per grid unit height
    opacity: 0.7,
  };

  return (
    // Add dark mode styles to the preview
    <div
      className="bg-gray-700 rounded-lg shadow-lg border-2 border-blue-500 overflow-hidden"
      style={style}
    >
      {/* Add icon to drag overlay */}
      <div className="p-2 sm:p-4 flex flex-col items-center justify-center h-full">
        {React.createElement(metadata.icon, {
          className: "w-4 h-4 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-300",
        })}
        <h3 className="font-semibold text-gray-100 text-center text-xs sm:text-sm">
          {type}
        </h3>
        <p className="text-xs text-gray-400 mt-1 hidden sm:block">
          Drag to place
        </p>
      </div>
    </div>
  );
}
