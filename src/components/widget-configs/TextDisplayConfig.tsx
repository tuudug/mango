import React from "react";
import { Label } from "@/components/ui/label";
// Removed Textarea import from shadcn/ui
import { WidgetConfigComponentProps } from "@/lib/widgetConfig"; // Import the props type

export function TextDisplayConfig({
  config,
  onChange,
}: WidgetConfigComponentProps) {
  const currentText = config?.text || ""; // Get current text or default to empty

  const handleTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...config, text: event.target.value }); // Update only the text field
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="widget-text-input" className="text-sm font-medium">
          Display Text
        </Label>
        {/* Use standard HTML textarea */}
        <textarea
          id="widget-text-input"
          value={currentText}
          onChange={handleTextChange}
          placeholder="Enter the text to display in the widget..."
          // Apply similar styling using Tailwind classes (combined into one)
          className="mt-1 min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <p className="text-xs text-gray-500 mt-1">
          This text will be shown in the widget body.
        </p>
      </div>
    </div>
  );
}
