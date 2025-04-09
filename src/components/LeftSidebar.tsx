import { Button } from "@/components/ui/button";
import { cn, compareVersions } from "@/lib/utils";
import {
  Bot,
  // CalendarDays, // Now imported from config
  // HeartPulse, // Now imported from config
  // Landmark, // Now imported from config
  // ListTodo, // Now imported from config
  Milestone,
  Pencil,
  User,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react"; // Import useCallback
import { ChangelogModal } from "./ChangelogModal";
// Import the panel components that will now be rendered here
import { YuzuPanel } from "./YuzuPanel"; // Renamed import
import { PathsPage } from "./PathsPage";
import { UserProfilePanel } from "./UserProfilePanel";
import { CalendarDataSource } from "./datasources/CalendarDataSource";
import { HealthDataSource } from "./datasources/HealthDataSource";
import { TodosDataSource } from "./datasources/TodosDataSource";
import { FinanceDataSource } from "./datasources/FinanceDataSource"; // Updated import path and name
import { HabitsDataSource } from "./datasources/HabitsDataSource"; // Import Habits panel
// Import the changelog data
import changelogData from "../../public/changelog.json";
// Import types and constants needed for PathsPage
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { useToast } from "@/contexts/ToastContext"; // Import useToast
import { pathsData } from "./dashboard/constants";
import { SavedPathState } from "./dashboard/types";
import {
  isMobileView as checkIsMobileView,
  loadPathStateFromLocalStorage,
  savePathStateToLocalStorage,
} from "./dashboard/utils";
// Import the new data source config
import { dataSourceConfig, DataSourceId } from "@/lib/dataSourceConfig";

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  toggleToolbox: (forceState?: boolean) => void;
  triggerShakeIndicator: () => void; // Add prop to trigger shake
}

const LOCALSTORAGE_KEY = "mango_last_read_changelog_version";
const latestVersion =
  changelogData && changelogData.length > 0 ? changelogData[0].version : "0";

// Helper type for panel open state, including non-data source panels
type PanelId = DataSourceId | "yuzu" | "userProfile" | "paths" | "habits"; // Renamed gameMaster to yuzu
type PanelOpenState = Record<PanelId, boolean>;

// Initial state for panels
const initialPanelState: PanelOpenState = {
  yuzu: false, // Renamed gameMaster to yuzu
  userProfile: false,
  paths: false,
  finance: false,
  calendar: false,
  health: false,
  todos: false,
  habits: false, // Add initial state for habits
};

export function LeftSidebar({
  isToolboxOpen,
  toggleToolbox,
  triggerShakeIndicator, // Receive prop
}: LeftSidebarProps) {
  const { showToast } = useToast(); // Get showToast function

  // Consolidated state for panel visibility
  const [panelOpenState, setPanelOpenState] =
    useState<PanelOpenState>(initialPanelState);

  // State for changelog modal
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);

  // State to track mobile view
  const [isMobileView, setIsMobileView] = useState(false);

  // Path State
  const [pathState, setPathState] = useState<SavedPathState>(
    loadPathStateFromLocalStorage
  );
  const { activePathName, unlockedItems, currentPathProgressXP } = pathState;

  // Effect to check window width on mount and resize using the utility function
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(checkIsMobileView());
    };
    checkMobile(); // Check on initial mount
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile); // Cleanup listener
  }, []);

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

  // --- Generic Panel Toggle Handler ---
  const handleTogglePanel = useCallback(
    (panelId: PanelId) => {
      if (isToolboxOpen) {
        triggerShakeIndicator();
        showToast({ title: "Please exit edit mode first.", variant: "info" });
        return;
      }
      setPanelOpenState((prevState) => {
        const isOpen = prevState[panelId];
        // Create a new state object with all panels closed
        const newState = { ...initialPanelState }; // Start with all false
        // If the clicked panel wasn't open, open it
        if (!isOpen) {
          newState[panelId] = true;
        }
        // Otherwise, all panels remain closed (effectively closing the clicked one)
        return newState;
      });
    },
    [isToolboxOpen, triggerShakeIndicator, showToast]
  );

  const handleToggleToolbox = () => {
    // Prevent toggling if in mobile view, but allow click to show toast
    if (isMobileView) {
      showToast({
        title: "Edit mode is disabled on mobile.",
        variant: "info",
      });
      return; // Stop further execution
    }
    // If not mobile, proceed with toggling
    toggleToolbox(); // Toggle the toolbox state via prop
    if (!isToolboxOpen) {
      // If toolbox is about to open
      // Close any open panels by resetting the panel state
      setPanelOpenState(initialPanelState);
    }
  };

  // Determine if any panel (excluding toolbox) is open
  const isAnyPanelOpen = Object.values(panelOpenState).some((isOpen) => isOpen);

  // Helper function to get panel class names
  // Updated to handle responsive width
  const getPanelClasses = (
    panelId: PanelId,
    maxWidthClass = "md:max-w-md" // Default max-width applied at md breakpoint
  ) =>
    cn(
      "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
      "w-[calc(100vw-4rem)]", // Full width minus sidebar on mobile/small screens
      "md:w-auto", // Allow content width on medium screens and up
      maxWidthClass, // Apply max-width constraint on medium screens and up (e.g., md:max-w-md)
      "bg-gray-800 shadow-lg",
      panelOpenState[panelId] ? "translate-x-0" : "-translate-x-full"
    );

  return (
    <>
      {/* Sidebar Buttons */}
      <aside className="fixed left-0 top-0 bottom-0 z-30 flex h-screen w-16 flex-col items-center border-r border-gray-700 bg-gray-800 py-4">
        {/* Logo Button */}
        <button
          onClick={handleLogoClick}
          title="View Changelog"
          // Removed overflow-hidden
          className={`relative mb-6 h-10 w-10 cursor-pointer rounded-lg transition-transform hover:scale-105 p-0 ${
            hasNewChangelog ? "widget-shake" : ""
          }`}
        >
          <img
            src="/icon.png"
            alt="Mango Logo"
            // Make image fill the button using object-cover
            className="h-full w-full object-cover rounded-lg" // Added rounded-lg to match button
          />
          {hasNewChangelog && (
            // Kept badge styling, including z-20
            <span className="absolute -top-1 -right-1 flex h-3 w-3 z-20">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
          )}
        </button>
        <nav className="flex flex-col items-center gap-3">
          {/* Toolbox Button */}
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={isMobileView ? 0 : -1}>
                  <Button
                    variant={isToolboxOpen ? "secondary" : "ghost"}
                    size="icon"
                    className={cn(
                      "h-10 w-10 rounded-lg",
                      isToolboxOpen ? "text-indigo-400" : "text-gray-400",
                      isMobileView && "opacity-50"
                    )}
                    onClick={handleToggleToolbox}
                    title={
                      isMobileView
                        ? "Edit mode disabled on mobile"
                        : "Toggle Edit Mode / Toolbox"
                    }
                  >
                    <Pencil size={20} />
                    <span className="sr-only">Toggle Toolbox</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">
                {isMobileView
                  ? "Edit mode disabled on mobile"
                  : "Toggle Edit Mode / Toolbox"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Yuzu Button */}
          <Button
            variant={panelOpenState.yuzu ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              panelOpenState.yuzu ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={() => handleTogglePanel("yuzu")}
            title="Toggle Yuzu Panel"
          >
            <Bot size={20} />
            <span className="sr-only">Toggle Yuzu</span>
          </Button>

          {/* Paths Button */}
          <Button
            variant={panelOpenState.paths ? "secondary" : "ghost"}
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              panelOpenState.paths ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={() => handleTogglePanel("paths")}
            title="Paths"
          >
            <Milestone size={20} />
            <span className="sr-only">Paths</span>
          </Button>
        </nav>
        {/* Data Sources Section - Rendered Programmatically */}
        <nav className="mt-6 flex flex-col items-center gap-3 border-t border-gray-700 pt-4">
          <span className="mb-1 text-[10px] font-medium text-gray-500">
            DATA
          </span>
          {dataSourceConfig.map(({ id, label, IconComponent }) => (
            <Button
              key={id}
              variant={panelOpenState[id] ? "secondary" : "ghost"}
              size="icon"
              className={`h-10 w-10 rounded-lg ${
                panelOpenState[id] ? "text-indigo-400" : "text-gray-400"
              }`}
              onClick={() => handleTogglePanel(id)}
              title={label}
            >
              <IconComponent size={20} />
              <span className="sr-only">{label}</span>
            </Button>
          ))}
        </nav>
        {/* User Profile Section */}
        <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-gray-700 pt-3 pb-2">
          <Button
            variant={panelOpenState.userProfile ? "secondary" : "ghost"}
            size="icon"
            className={`h-9 w-9 rounded-full hover:bg-gray-700 ${
              panelOpenState.userProfile ? "text-indigo-400" : "text-gray-400"
            }`}
            onClick={() => handleTogglePanel("userProfile")}
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
        onClick={() => {
          // Find the currently open panel and close it
          const openPanelId = Object.keys(panelOpenState).find(
            (key) => panelOpenState[key as PanelId]
          ) as PanelId | undefined;
          if (openPanelId) {
            handleTogglePanel(openPanelId);
          }
        }}
        aria-hidden="true"
      />

      {/* Render Panels Conditionally */}
      {/* Updated panel rendering to use modified getPanelClasses with explicit breakpoints */}
      <div className={getPanelClasses("yuzu", "md:max-w-md")}>
        <YuzuPanel onClose={() => handleTogglePanel("yuzu")} />
      </div>
      <div className={getPanelClasses("userProfile", "md:max-w-md")}>
        <UserProfilePanel onClose={() => handleTogglePanel("userProfile")} />
      </div>
      <div className={getPanelClasses("paths", "md:max-w-md")}>
        <PathsPage
          onClose={() => handleTogglePanel("paths")}
          activePathName={activePathName}
          setActivePath={setActivePath}
          unlockedItems={unlockedItems}
          currentPathProgressXP={currentPathProgressXP}
          nextUnlockXP={nextUnlockXP}
        />
      </div>
      {/* Data Source Panels */}
      <div className={getPanelClasses("calendar", "md:max-w-sm")}>
        <CalendarDataSource onClose={() => handleTogglePanel("calendar")} />
      </div>
      <div className={getPanelClasses("health", "md:max-w-sm")}>
        <HealthDataSource onClose={() => handleTogglePanel("health")} />
      </div>
      <div className={getPanelClasses("todos", "md:max-w-sm")}>
        <TodosDataSource onClose={() => handleTogglePanel("todos")} />
      </div>
      <div className={getPanelClasses("finance", "md:max-w-sm")}>
        <FinanceDataSource onClose={() => handleTogglePanel("finance")} />{" "}
        {/* Updated component name */}
      </div>
      <div className={getPanelClasses("habits", "md:max-w-sm")}>
        {" "}
        {/* Add Habits Panel */}
        <HabitsDataSource onClose={() => handleTogglePanel("habits")} />
      </div>

      {/* Render the changelog modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onOpenChange={setIsChangelogOpen}
      />
    </>
  );
}
