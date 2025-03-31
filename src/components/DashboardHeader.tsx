import React from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon, Pencil, Check } from "lucide-react"; // Import Pencil and Check
import { useTheme } from "./ThemeProvider";
import { Mode } from "@/lib/dashboardConfig"; // Import Mode type

interface DashboardHeaderProps {
  mode: Mode;
  toggleMode: () => void;
}

export function DashboardHeader({ mode, toggleMode }: DashboardHeaderProps) {
  const { theme, setTheme } = useTheme(); // Get theme state and setter

  return (
    <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center z-10">
      {/* Left side: Title + Edit/View Button */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Mango
        </h1>
        {/* Edit/View Icon Button */}
        <Button
          onClick={toggleMode}
          variant="ghost" // Changed to ghost for less emphasis
          size="icon" // Make it an icon button
          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" // Adjusted size and styling
        >
          {mode === "view" ? (
            <Pencil size={16} />
          ) : (
            <Check size={18} /> // Slightly larger check icon
          )}
          <span className="sr-only">
            {mode === "view" ? "Edit Dashboard" : "View Dashboard"}
          </span>
        </Button>
      </div>

      {/* Right side: Theme Toggle */}
      <div className="flex gap-2 items-center">
        {/* Dark Mode Toggle Button */}
        <Button
          variant="ghost" // Changed to ghost
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-8 w-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700" // Adjusted size and styling
        >
          <Sun className="h-[1.1rem] w-[1.1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.1rem] w-[1.1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  );
}
