import React, { useState, useEffect } from "react"; // Import useState, useEffect
import { Button } from "@/components/ui/button";
import { Smartphone, Monitor, X } from "lucide-react";
import { DashboardName } from "../types";
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface EditModeIndicatorProps {
  isToolboxOpen: boolean;
  editTargetDashboard: DashboardName;
  toggleEditTarget: () => void;
  toggleToolbox: () => void;
  shakeCount: number;
}

export const EditModeIndicator: React.FC<EditModeIndicatorProps> = ({
  isToolboxOpen,
  editTargetDashboard,
  toggleEditTarget,
  toggleToolbox,
  shakeCount,
}) => {
  const [isShaking, setIsShaking] = useState(false);

  // Effect to trigger shake animation
  useEffect(() => {
    if (shakeCount > 0) {
      setIsShaking(true);
      const timer = setTimeout(() => {
        setIsShaking(false);
      }, 600); // Duration should match CSS animation duration (.indicator-shake)
      return () => clearTimeout(timer);
    }
  }, [shakeCount]);

  return (
    // Outer div handles positioning and centering ONLY
    <div
      className={cn(
        // Base styles for positioning and transition
        `fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ease-in-out`, // Use transition-all
        // Conditional styles for visibility (transform + opacity + pointer-events)
        isToolboxOpen
          ? "translate-y-0 opacity-100 pointer-events-auto"
          : "translate-y-full opacity-0 pointer-events-none"
      )}
    >
      {/* Inner div handles appearance and shake animation */}
      <div
        className={cn(
          "bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-3",
          isShaking && "indicator-shake" // Apply shake to inner div
        )}
      >
        {/* Edit Target Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white rounded-full h-6 w-6"
          onClick={toggleEditTarget}
          title={`Switch to editing ${
            editTargetDashboard === "default" ? "Mobile" : "Desktop"
          } layout`}
        >
          {editTargetDashboard === "default" ? (
            <Smartphone className="h-4 w-4" />
          ) : (
            <Monitor className="h-4 w-4" />
          )}
        </Button>
        {/* Indicator Text */}
        <span>
          Editing {editTargetDashboard === "default" ? "Desktop" : "Mobile"}{" "}
          Layout
        </span>
        {/* Close Edit Mode Button */}
        <Button
          variant="ghost"
          size="icon"
          className="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white rounded-full h-6 w-6"
          onClick={toggleToolbox}
          title="Exit Edit Mode"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
