import React from "react";
import { Button } from "@/components/ui/button";
import {
  Pencil,
  Bot,
  User,
  Milestone,
  CalendarDays, // Icon for Calendar
  HeartPulse, // Icon for Health
  ListTodo, // Icon for Todos
} from "lucide-react";

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  isGameMasterPanelOpen: boolean;
  isUserProfilePanelOpen: boolean;
  isPathsPageOpen: boolean;
  isCalendarDataSourceOpen: boolean; // New prop
  isHealthDataSourceOpen: boolean; // New prop
  isTodosDataSourceOpen: boolean; // New prop
  toggleToolbox: () => void;
  toggleGameMasterPanel: () => void;
  onProfileClick: () => void;
  togglePathsPage: () => void;
  toggleCalendarDataSource: () => void; // New prop
  toggleHealthDataSource: () => void; // New prop
  toggleTodosDataSource: () => void; // New prop
}

export function LeftSidebar({
  isToolboxOpen,
  isGameMasterPanelOpen,
  isUserProfilePanelOpen,
  isPathsPageOpen,
  isCalendarDataSourceOpen, // Destructure new prop
  isHealthDataSourceOpen, // Destructure new prop
  isTodosDataSourceOpen, // Destructure new prop
  toggleToolbox,
  toggleGameMasterPanel,
  onProfileClick,
  togglePathsPage,
  toggleCalendarDataSource, // Destructure new prop
  toggleHealthDataSource, // Destructure new prop
  toggleTodosDataSource, // Destructure new prop
}: LeftSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 bottom-0 z-30 flex h-screen w-16 flex-col items-center border-r border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Logo Placeholder with Emoji */}
      <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-pink-500">
        {" "}
        {/* Added flex centering */}
        <span className="text-2xl">🥭</span> {/* Added Mango Emoji */}
      </div>{" "}
      {/* Styled placeholder */}
      {/* Removed mt-4 from nav */}
      <nav className="flex flex-col items-center gap-3">
        <Button
          variant={isToolboxOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isToolboxOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={toggleToolbox}
          title="Toggle Edit Mode / Toolbox"
        >
          <Pencil size={20} />
          <span className="sr-only">Toggle Toolbox</span>
        </Button>

        <Button
          variant={isGameMasterPanelOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isGameMasterPanelOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={toggleGameMasterPanel}
          title="Toggle Game Master Panel"
        >
          <Bot size={20} />
          <span className="sr-only">Toggle Game Master</span>
        </Button>

        {/* Paths Button */}
        <Button
          variant={isPathsPageOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isPathsPageOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={togglePathsPage}
          title="Paths"
        >
          <Milestone size={20} />
          <span className="sr-only">Paths</span>
        </Button>

        {/* Add more sidebar icons later if needed */}
      </nav>
      {/* Data Sources Section */}
      <nav className="mt-6 flex flex-col items-center gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <span className="mb-1 text-[10px] font-medium text-gray-400 dark:text-gray-500">
          DATA
        </span>
        <Button
          variant={isCalendarDataSourceOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isCalendarDataSourceOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={toggleCalendarDataSource}
          title="Calendar Data Source"
        >
          <CalendarDays size={20} />
          <span className="sr-only">Calendar Data</span>
        </Button>
        <Button
          variant={isHealthDataSourceOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isHealthDataSourceOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={toggleHealthDataSource}
          title="Health Data Source"
        >
          <HeartPulse size={20} />
          <span className="sr-only">Health Data</span>
        </Button>
        <Button
          variant={isTodosDataSourceOpen ? "secondary" : "ghost"}
          size="icon"
          className={`h-10 w-10 rounded-lg ${
            isTodosDataSourceOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={toggleTodosDataSource}
          title="Todos Data Source"
        >
          <ListTodo size={20} />
          <span className="sr-only">Todos Data</span>
        </Button>
      </nav>
      {/* User Profile Section */}
      <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-gray-200 pt-3 pb-2 dark:border-gray-700">
        {/* Clickable User Icon Button */}
        <Button
          variant={isUserProfilePanelOpen ? "secondary" : "ghost"} // Add active state styling
          size="icon"
          className={`h-9 w-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
            isUserProfilePanelOpen
              ? "text-indigo-600 dark:text-indigo-400"
              : "text-gray-500 dark:text-gray-400"
          }`}
          onClick={onProfileClick}
          title="User Profile"
        >
          <User size={18} />
          <span className="sr-only">User Profile</span>
        </Button>
        {/* Level */}
        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
          Level 1
        </span>
        {/* Points */}
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          150 pts
        </span>
      </div>
    </aside>
  );
}
