import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // Import cn for conditional classes
import {
  Bot,
  CalendarDays,
  HeartPulse,
  ListTodo,
  Milestone,
  Pencil,
  User,
} from "lucide-react";
import { useEffect, useState } from "react"; // Import useState and useEffect
import { ChangelogModal } from "./ChangelogModal";

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  isGameMasterPanelOpen: boolean;
  isUserProfilePanelOpen: boolean;
  isPathsPageOpen: boolean;
  isCalendarDataSourceOpen: boolean;
  isHealthDataSourceOpen: boolean;
  isTodosDataSourceOpen: boolean;
  toggleToolbox: () => void;
  toggleGameMasterPanel: () => void;
  onProfileClick: () => void;
  togglePathsPage: () => void;
  toggleCalendarDataSource: () => void;
  toggleHealthDataSource: () => void;
  toggleTodosDataSource: () => void;
}

const CURRENT_APP_VERSION = "0.1"; // Define current app version
const LOCALSTORAGE_KEY = "mango_last_read_changelog_version";

export function LeftSidebar({
  isToolboxOpen,
  isGameMasterPanelOpen,
  isUserProfilePanelOpen,
  isPathsPageOpen,
  isCalendarDataSourceOpen,
  isHealthDataSourceOpen,
  isTodosDataSourceOpen,
  toggleToolbox,
  toggleGameMasterPanel,
  onProfileClick,
  togglePathsPage,
  toggleCalendarDataSource,
  toggleHealthDataSource,
  toggleTodosDataSource,
}: LeftSidebarProps) {
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false); // State for notification

  // Check localStorage on mount
  useEffect(() => {
    try {
      const lastReadVersion = localStorage.getItem(LOCALSTORAGE_KEY);
      // Basic comparison, assumes simple numeric versions for now
      if (
        !lastReadVersion ||
        parseFloat(lastReadVersion) < parseFloat(CURRENT_APP_VERSION)
      ) {
        setHasNewChangelog(true);
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      // Decide if we should show notification on error? Maybe not.
      setHasNewChangelog(false);
    }
  }, []); // Run only once on mount

  const handleLogoClick = () => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, CURRENT_APP_VERSION);
      setHasNewChangelog(false); // Hide notification once clicked
      setIsChangelogOpen(true); // Open modal
    } catch (error) {
      console.error("Error writing to localStorage:", error);
      // Still open the modal even if saving fails
      setIsChangelogOpen(true);
    }
  };

  return (
    <>
      <aside className="fixed left-0 top-0 bottom-0 z-30 flex h-screen w-16 flex-col items-center border-r border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-800">
        {/* Logo Button */}
        <button
          onClick={handleLogoClick} // Use new handler
          title="View Changelog"
          className={cn(
            "relative mb-6 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 transition-transform hover:scale-105",
            hasNewChangelog && "widget-shake" // Apply shake animation if new
          )}
        >
          <span className="text-2xl">🥭</span>
          {/* Badge */}
          {hasNewChangelog && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              {/* Changed red to blue */}
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}
        </button>
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
          <Button
            variant={isUserProfilePanelOpen ? "secondary" : "ghost"}
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
          <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300">
            Level 1
          </span>
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            150 pts
          </span>
        </div>
      </aside>
      {/* Render the modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onOpenChange={setIsChangelogOpen}
      />
    </>
  );
}
