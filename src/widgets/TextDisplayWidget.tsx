import { useDashboardConfig } from "@/contexts/DashboardConfigContext";

// Define the props your widget expects
interface WidgetProps {
  id: string;
  w: number;
  h: number;
  config?: { text?: string }; // Config expects an optional 'text' property
}

export function TextDisplayWidget({ id, w: _w, h: _h }: WidgetProps) {
  // Removed config from props destructuring
  const { widgetConfigs } = useDashboardConfig(); // Consume the widgetConfigs map

  // Get the specific config for this widget instance from the context
  const currentWidgetConfig = widgetConfigs[id];
  const displayText = currentWidgetConfig?.text || "No text configured."; // Default text

  return (
    <div className="p-4 h-full flex flex-col items-start justify-start overflow-auto">
      <h2 className="text-sm font-semibold mb-2 text-gray-400">
        Text Display Widget
      </h2>
      <p className="text-base text-gray-100 whitespace-pre-wrap break-words">
        {displayText}
      </p>
      {/* Removed commented-out debug code */}
    </div>
  );
}
