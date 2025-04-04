import { cn } from "@/lib/utils";
// Update imports to use widgetConfig.ts
import { WidgetType } from "@/lib/widgetConfig";
import { defaultWidgetLayouts } from "@/lib/widgetConfig";
import { widgetMetadata } from "@/lib/widgetConfig";
import { GripVertical } from "lucide-react";

interface WidgetPreviewProps {
  type: WidgetType;
}

export function WidgetPreview({ type }: WidgetPreviewProps) {
  const metadata = widgetMetadata[type];
  const layout = defaultWidgetLayouts[type];
  const Icon = metadata.icon;

  // Estimate height based on layout 'h' (assuming rowHeight=30, margin=10)
  const estimatedHeight = layout ? `${layout.h * (30 + 10) - 10}px` : "150px"; // Default height

  return (
    <div
      className={cn(
        "flex cursor-grabbing items-center gap-3 rounded-md border border-gray-600 bg-gray-700 p-3 shadow-lg", // Use slightly darker border/bg for overlay
        metadata.colorAccentClass, // Apply accent color
        "border-l-4" // Ensure left border is thick enough
      )}
      style={{ height: estimatedHeight }} // Apply estimated height
    >
      <Icon className="h-5 w-5 flex-shrink-0 text-gray-300" />
      <span className="flex-1 text-sm font-medium text-gray-100">{type}</span>
      <GripVertical className="h-5 w-5 flex-shrink-0 text-gray-500" />
    </div>
  );
}
