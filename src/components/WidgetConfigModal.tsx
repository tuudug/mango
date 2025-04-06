import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
// Import the config component map and type
import { GridItem } from "@/lib/dashboardConfig"; // Import GridItem for config structure
import { WidgetType, widgetConfigComponents } from "@/lib/widgetConfig";
import { useEffect, useRef, useState } from "react"; // Import hooks including useRef

interface WidgetConfigModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  widgetId: string;
  widgetType: WidgetType;
  currentConfig: GridItem["config"]; // Use GridItem['config'] type (Record<string, any> | undefined)
  onSave: (newConfig: GridItem["config"]) => void; // Callback to save changes
}

export function WidgetConfigModal({
  isOpen,
  onOpenChange,
  widgetId,
  widgetType,
  currentConfig,
  onSave,
}: WidgetConfigModalProps) {
  // State to hold the temporary config being edited within the specific config component
  const [tempConfig, setTempConfig] = useState<GridItem["config"]>(
    currentConfig ?? {}
  );
  // Ref to track the widgetId for which the state was last initialized
  const initializedWidgetId = useRef<string | null>(null);

  // Look up the specific config component based on widgetType
  const ConfigComponent = widgetConfigComponents[widgetType]; // Use the imported map

  const handleSave = () => {
    // Only save if there was a config component (meaning changes could be made)
    if (ConfigComponent) {
      // Removed console.log
      onSave(tempConfig); // Call the main save function passed from DashboardGridItem
    }
    onOpenChange(false); // Close the modal
  };

  // Logging Wrapper for onChange from child config component
  const handleConfigChange = (newConfig: GridItem["config"]) => {
    // Removed console.logs
    setTempConfig(newConfig);
  };

  // Removed logging useEffect

  // Effect to reset state ONLY when the modal initially opens for a specific widgetId
  useEffect(() => {
    // Reset if the modal is open AND (it's the first time opening OR the widgetId changed)
    if (isOpen && initializedWidgetId.current !== widgetId) {
      // Removed console.log
      setTempConfig(currentConfig ?? {});
      initializedWidgetId.current = widgetId; // Mark this widgetId as initialized
    } else if (!isOpen) {
      // Reset the ref when the modal closes so it re-initializes next time
      initializedWidgetId.current = null;
    }
    // Only depend on isOpen and widgetId. Do NOT depend on currentConfig here.
  }, [isOpen, widgetId]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent
        // Using key={widgetId} might still be simpler if this useEffect logic gets complex
        key={widgetId} // Keep key to ensure state resets properly if configuring different widgets sequentially
        className="sm:max-w-[425px] bg-gray-850 border-gray-700"
      >
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            Configure: {widgetType}
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 text-gray-300">
          {ConfigComponent ? (
            <ConfigComponent
              config={tempConfig}
              onChange={handleConfigChange}
            />
          ) : (
            <p className="text-sm text-gray-500">
              No specific configuration available for this widget.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              className="text-gray-300 border-gray-600 hover:bg-gray-700"
            >
              Cancel
            </Button>
          </DialogClose>
          {ConfigComponent && (
            <Button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
