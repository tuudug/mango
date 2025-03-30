import React from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";
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
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
        Mango Dashboard
      </h1>
      <div className="flex gap-2 items-center">
        {/* Dark Mode Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="h-9 w-9" // Adjust size if needed
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
        {/* Edit/View Button */}
        <Button
          onClick={toggleMode}
          variant="outline" // Keep outline variant for contrast
          className="transition-all duration-300"
        >
          {mode === "view" ? "Edit Dashboard" : "View Dashboard"}
        </Button>
      </div>
    </header>
  );
}
