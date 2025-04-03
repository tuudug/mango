import { Button } from "@/components/ui/button";
import { cn, compareVersions } from "@/lib/utils";
import {
  Bot,
  CalendarDays,
  HeartPulse,
  Landmark, // Import finance icon
  ListTodo,
  Milestone,
  Pencil,
  User,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react"; // Import useMemo
import { ChangelogModal } from "./ChangelogModal";
// Import the panel components that will now be rendered here
import { GameMasterPanel } from "./GameMasterPanel";
import { UserProfilePanel } from "./UserProfilePanel";
import { PathsPage } from "./PathsPage";
import { CalendarDataSource } from "./datasources/CalendarDataSource";
import { HealthDataSource } from "./datasources/HealthDataSource";
import { TodosDataSource } from "./datasources/TodosDataSource";
import { FinanceSettingsPanel } from "./finance/FinanceSettingsPanel"; // Import finance panel
// Import the changelog data
import changelogData from "../../public/changelog.json";
// Import types and constants needed for PathsPage
import { pathsData } from "./dashboard/constants";
import { SavedPathState } from "./dashboard/types";
import {
  loadPathStateFromLocalStorage,
  savePathStateToLocalStorage,
} from "./dashboard/utils";
import { useToast } from "@/contexts/ToastContext"; // Import useToast

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  toggleToolbox: (forceState?: boolean) => void;
  triggerShakeIndicator: () => void; // Add prop to trigger shake
}

const LOCALSTORAGE_KEY = "mango_last_read_changelog_version";
const latestVersion =
  changelogData && changelogData.length > 0 ? changelogData[0].version : "0";

export function LeftSidebar({
  isToolboxOpen,
  toggleToolbox,
  triggerShakeIndicator, // Receive prop
}: LeftSidebarProps) {
  const { showToast } = useToast(); // Get showToast function

  // State for panels is now managed internally
  const [isGameMasterPanelOpen, setIsGameMasterPanelOpen] = useState(false);
  const [isUserProfilePanelOpen, setIsUserProfilePanelOpen] = useState(false);
  const [isPathsPageOpen, setIsPathsPageOpen] = useState(false);
  const [isCalendarDataSourceOpen, setIsCalendarDataSourceOpen] =
    useState(false);
  const [isHealthDataSourceOpen, setIsHealthDataSourceOpen] = useState(false);
  const [isTodosDataSourceOpen, setIsTodosDataSourceOpen] = useState(false);
  const [isFinanceSettingsPanelOpen, setIsFinanceSettingsPanelOpen] =
    useState(false); // State for finance panel

  // State for changelog modal
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);

  // Path State
  const [pathState, setPathState] = useState<SavedPathState>(
    loadPathStateFromLocalStorage
  );
  const { activePathName, unlockedItems, currentPathProgressXP } = pathState;

  // Effect to save path state
  useEffect(() => {
    savePathStateToLocalStorage(pathState);
  }, [pathState]);

  // Calculate next unlock XP
  const nextUnlockXP = useMemo(() => {
    if (!activePathName) return 0;
    const activePath = pathsData.find((p) => p.name === activePathName);
    if (!activePath) return 0;
    const nextItem = activePath.items.find(
      (item) => !unlockedItems[item.label]
    );
    return nextItem ? nextItem.xpCost : 0;
  }, [activePathName, unlockedItems]);

  // Set Active Path
  const setActivePath = (pathName: string) => {
    setPathState((prev) => ({
      ...prev,
      activePathName: pathName,
      currentPathProgressXP: 0,
    }));
  };

  // Check localStorage for changelog
  useEffect(() => {
    try {
      const lastReadVersion = localStorage.getItem(LOCALSTORAGE_KEY) || "0";
      if (compareVersions(latestVersion, lastReadVersion) > 0) {
        setHasNewChangelog(true);
      } else {
        setHasNewChangelog(false);
      }
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      setHasNewChangelog(false);
    }
  }, []);

  const handleLogoClick = () => {
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, latestVersion);
      setHasNewChangelog(false);
      setIsChangelogOpen(true);
    } catch (error) {
      console.error("Error writing to localStorage:", error);
      setIsChangelogOpen(true);
    }
  };

  // --- Internal Toggle Handlers ---
  const closeAllPanels = () => {
    setIsGameMasterPanelOpen(false);
    setIsUserProfilePanelOpen(false);
    setIsPathsPageOpen(false);
    setIsCalendarDataSourceOpen(false);
    setIsHealthDataSourceOpen(false);
    setIsTodosDataSourceOpen(false);
    setIsFinanceSettingsPanelOpen(false); // Close finance panel too
  };

  // --- Revised Individual Toggle Handlers ---
  const handleToggleGameMaster = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isGameMasterPanelOpen) {
      closeAllPanels();
      setIsGameMasterPanelOpen(true);
    } else {
      setIsGameMasterPanelOpen(false);
    }
  };

  const handleToggleUserProfile = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isUserProfilePanelOpen) {
      closeAllPanels();
      setIsUserProfilePanelOpen(true);
    } else {
      setIsUserProfilePanelOpen(false);
    }
  };

  const handleTogglePaths = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isPathsPageOpen) {
      closeAllPanels();
      setIsPathsPageOpen(true);
    } else {
      setIsPathsPageOpen(false);
    }
  };

  const handleToggleCalendar = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isCalendarDataSourceOpen) {
      closeAllPanels();
      setIsCalendarDataSourceOpen(true);
    } else {
      setIsCalendarDataSourceOpen(false);
    }
  };

  const handleToggleHealth = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isHealthDataSourceOpen) {
      closeAllPanels();
      setIsHealthDataSourceOpen(true);
    } else {
      setIsHealthDataSourceOpen(false);
    }
  };

  const handleToggleTodos = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isTodosDataSourceOpen) {
      closeAllPanels();
      setIsTodosDataSourceOpen(true);
    } else {
      setIsTodosDataSourceOpen(false);
    }
  };

  // Handler for Finance Settings Panel
  const handleToggleFinance = () => {
    if (isToolboxOpen) {
      triggerShakeIndicator();
      showToast({ title: "Please exit edit mode first.", variant: "info" });
      return;
    }
    if (!isFinanceSettingsPanelOpen) {
      closeAllPanels();
      setIsFinanceSettingsPanelOpen(true);
    } else {
      setIsFinanceSettingsPanelOpen(false);
    }
  };

  const handleToggleToolbox = () => {
    toggleToolbox(); // Toggle the toolbox state via prop
    if (!isToolboxOpen) {
      // If toolbox is about to open
      closeAllPanels(); // Close any open panels
    }
  };

  // Determine if any panel (excluding toolbox) is open
  const isAnyPanelOpen =
    isGameMasterPanelOpen ||
    isUserProfilePanelOpen ||
    isPathsPageOpen ||
    isCalendarDataSourceOpen ||
    isHealthDataSourceOpen ||
    isTodosDataSourceOpen ||
    isFinanceSettingsPanelOpen; // Include finance panel

  return (
    <>
      {/* Sidebar Buttons (Structure remains the same) */}
      <aside className="fixed left-0 top-0 bottom-0 z-30 flex h-screen w-16 flex-col items-center border-r border-gray-700 bg-gray-800 py-4">
        {/* Logo Button */}
        <button
          onClick={handleLogoClick}
          title="View Changelog"
          className={cn(
            "relative mb-6 flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-pink-500 transition-transform hover:scale-105",
            hasNewChangelog && "widget-shake"
          )}
        >
          <span className="text-2xl">🥭</span>
          {hasNewChangelog && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}
        </button>
        <nav className="flex flex-col items-center gap-3">
          {/* Toolbox Button */}
          <Button
            variant={isToolboxOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isToolboxOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleToolbox}
            title="Toggle Edit Mode / Toolbox"
          >
            <Pencil size={20} />
            <span className="sr-only">Toggle Toolbox</span>
          </Button>

          {/* Game Master Button */}
          <Button
            variant={isGameMasterPanelOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isGameMasterPanelOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleGameMaster}
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
              isPathsPageOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleTogglePaths}
            title="Paths"
          >
            <Milestone size={20} />
            <span className="sr-only">Paths</span>
          </Button>
        </nav>
        {/* Data Sources Section */}
        <nav className="mt-6 flex flex-col items-center gap-3 border-t border-gray-700 pt-4">
          <span className="mb-1 text-[10px] font-medium text-gray-500">
            DATA
          </span>
          {/* Finance Button */}
          <Button
            variant={isFinanceSettingsPanelOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isFinanceSettingsPanelOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleFinance}
            title="Finance Settings"
          >
            <Landmark size={20} />
            <span className="sr-only">Finance Settings</span>
          </Button>
          <Button
            variant={isCalendarDataSourceOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isCalendarDataSourceOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleCalendar}
            title="Calendar Data Source"
          >
            <CalendarDays size={20} />
            <span className="sr-only">Calendar Data</span>
          </Button>
          <Button
            variant={isHealthDataSourceOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isHealthDataSourceOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleHealth}
            title="Health Data Source"
          >
            <HeartPulse size={20} />
            <span className="sr-only">Health Data</span>
          </Button>
          <Button
            variant={isTodosDataSourceOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              isTodosDataSourceOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleTodos}
            title="Todos Data Source"
          >
            <ListTodo size={20} />
            <span className="sr-only">Todos Data</span>
          </Button>
        </nav>
        {/* User Profile Section */}
        <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-gray-700 pt-3 pb-2">
          <Button
            variant={isUserProfilePanelOpen ? "secondary" : "ghost"}
            size="icon"
            className={`h-9 w-9 rounded-full hover:bg-gray-700 ${
              isUserProfilePanelOpen ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={handleToggleUserProfile}
            title="User Profile"
          >
            <User size={18} />
            <span className="sr-only">User Profile</span>
          </Button>
          {/* TODO: Get level/points dynamically */}
          <span className="text-[10px] font-medium text-gray-300">Level 1</span>
          <span className="text-[10px] text-gray-400">150 pts</span>
        </div>
      </aside>

      {/* Overlay for darkening the background */}
      <div
        className={cn(
          "fixed inset-0 left-16 z-10 bg-black/50 transition-opacity duration-300",
          isAnyPanelOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={closeAllPanels} // Close any open panel when overlay is clicked
        aria-hidden="true"
      />

      {/* Render Panels Conditionally with updated styles */}
      {/* ... (GameMaster, UserProfile, Paths panels remain the same) ... */}
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-md w-full bg-gray-800 shadow-lg", // Add background, max-width, shadow
          isGameMasterPanelOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <GameMasterPanel onClose={handleToggleGameMaster} />
      </div>
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-md w-full bg-gray-800 shadow-lg", // Add background, max-width, shadow
          isUserProfilePanelOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <UserProfilePanel onClose={handleToggleUserProfile} />
      </div>
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-md w-full bg-gray-800 shadow-lg", // Add background, max-width, shadow
          isPathsPageOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <PathsPage
          onClose={handleTogglePaths}
          activePathName={activePathName}
          setActivePath={setActivePath}
          unlockedItems={unlockedItems}
          currentPathProgressXP={currentPathProgressXP}
          nextUnlockXP={nextUnlockXP}
        />
      </div>
      {/* Data Source Panels */}
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-sm w-full bg-gray-800 shadow-lg", // Use max-w-sm for data sources
          isCalendarDataSourceOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <CalendarDataSource />
      </div>
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-sm w-full bg-gray-800 shadow-lg", // Use max-w-sm
          isHealthDataSourceOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <HealthDataSource />
      </div>
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-sm w-full bg-gray-800 shadow-lg", // Use max-w-sm
          isTodosDataSourceOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <TodosDataSource />
      </div>
      {/* Finance Settings Panel */}
      <div
        className={cn(
          "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
          "max-w-sm w-full bg-gray-800 shadow-lg", // Use max-w-sm
          isFinanceSettingsPanelOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <FinanceSettingsPanel />
        {/* Add onClose prop if needed later */}
      </div>

      {/* Render the changelog modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onOpenChange={setIsChangelogOpen}
      />
    </>
  );
}
