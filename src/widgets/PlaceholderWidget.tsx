import React from "react";
// import { Button } from "@/components/ui/button"; // No longer needed

// Remove the unused interface and type annotation
export const PlaceholderWidget: React.FC = () => {
  return (
    // Added dark mode classes
    <div className="p-4 h-full w-full flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
      <span className="text-gray-500 dark:text-gray-400 italic">
        Add some widgets :)
      </span>
    </div>
  );
};
