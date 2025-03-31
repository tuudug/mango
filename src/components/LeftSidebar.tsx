import React from "react";
import { Button } from "@/components/ui/button";
import { Pencil, Bot, User, Milestone } from "lucide-react"; // Import Milestone icon

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  isGameMasterPanelOpen: boolean;
  isUserProfilePanelOpen: boolean;
  isPathsPageOpen: boolean; // Renamed prop
  toggleToolbox: () => void;
  toggleGameMasterPanel: () => void;
  onProfileClick: () => void;
  togglePathsPage: () => void; // Renamed prop
}

export function LeftSidebar({
  isToolboxOpen,
  isGameMasterPanelOpen,
  isUserProfilePanelOpen,
  isPathsPageOpen, // Use renamed prop
  toggleToolbox,
  toggleGameMasterPanel,
  onProfileClick,
  togglePathsPage, // Use renamed prop
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
