import React from "react";
// Removed Button, Sun, Moon, and useTheme imports as they are no longer needed

// No props needed
export function DashboardHeader() {
  // Removed useTheme hook call

  return (
    // Removed pl-20, header content now starts relative to its container
    <header className="pr-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center z-10">
      {/* Left side: Title Only */}
      <div>
        <h1 className="pl-6 text-2xl font-bold text-gray-800 dark:text-gray-100">
          Mango
        </h1>
      </div>

      {/* Right side: Removed Theme Toggle */}
      {/* The div containing the button has been removed */}
    </header>
  );
}
