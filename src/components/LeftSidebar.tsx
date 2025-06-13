import { Button } from "@/components/ui/button";
import { cn, compareVersions } from "@/lib/utils";
import {
  Bot,
  Milestone,
  Pencil,
  // Target, // Quests system disabled
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ChangelogModal } from "./ChangelogModal";
import { usePanelManagerStore, PanelId } from "@/stores/panelManagerStore"; // Import PanelManager store and type
// Import the panel components
import { PathsPage } from "./PathsPage";
import { UserProfilePanel } from "./UserProfilePanel";
import { YuzuPanel } from "./YuzuPanel";
import { CalendarDataSource } from "./datasources/CalendarDataSource";
import { FinanceDataSource } from "./datasources/FinanceDataSource";
import { HabitsDataSource } from "./datasources/HabitsDataSource";
import { HealthDataSource } from "./datasources/HealthDataSource";
import { TodosDataSource } from "./datasources/TodosDataSource";
// Import the changelog data
import changelogData from "../../public/changelog.json";
// Import types and constants needed for PathsPage
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToastStore } from "@/stores/toastStore";
// import { pathsData } from "./dashboard/constants"; // Use pathsConfig from lib now
import { SavedPathState } from "./dashboard/types"; // Keep type for now, needs refactor later
import {
  isMobileView as checkIsMobileView,
  loadPathStateFromLocalStorage,
  savePathStateToLocalStorage,
} from "./dashboard/utils";
// Import the new data source config
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
// Removed FetchManager hook import
import { dataSourceConfig } from "@/lib/dataSourceConfig"; // Removed DataSourceId import as PanelId covers it
// Removed formatDistanceToNow import
// import { QuestsPanel } from "./datasources/QuestsPanel"; // Quests system disabled

interface LeftSidebarProps {
  isToolboxOpen: boolean;
  toggleToolbox: (forceState?: boolean) => void;
  triggerShakeIndicator: () => void;
}

const LOCALSTORAGE_KEY = "mango_last_read_changelog_version";
const latestVersion =
  changelogData && changelogData.length > 0 ? changelogData[0].version : "0";

// Removed local PanelId type, PanelOpenState, and initialPanelState

export function LeftSidebar({
  isToolboxOpen,
  toggleToolbox,
  triggerShakeIndicator,
}: LeftSidebarProps) {
  const { showToast } = useToastStore();
  const { level, xp } = useAuthStore(); // Get level and xp from AuthStore
  // Removed fetch manager state and function
  const { openPanelId, openPanel, closePanel } = usePanelManagerStore(); // Use PanelManager store

  // State for changelog modal
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [hasNewChangelog, setHasNewChangelog] = useState(false);

  // State to track mobile view
  const [isMobileView, setIsMobileView] = useState(false);

  // Path State
  const [pathState, setPathState] = useState<SavedPathState>(
    loadPathStateFromLocalStorage
  );
  // Adapt state names for clarity, though underlying structure needs refactor
  // TODO: Refactor pathState to use IDs, Sparks, and Set<string> for unlocked rewards
  const {
    activePathName,
    // unlockedItems,
    currentPathProgressXP: currentPathProgressSparks,
  } = pathState;

  // Effect to check window width on mount and resize using the utility function
  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(checkIsMobileView());
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Effect to save path state
  useEffect(() => {
    savePathStateToLocalStorage(pathState);
  }, [pathState]);

  // TODO: Remove this calculation once state is refactored
  // const nextUnlockXP = useMemo(() => {
  //   if (!activePathName) return 0;
  //   // This needs to use pathsConfig and check sparkCost based on unlockedRewardIds Set
  //   // Placeholder logic:
  //   return 0;
  // }, [activePathName, unlockedItems]); // Dependencies need update

  // Set Active Path ID (using name as ID for now)
  // TODO: Update to use actual path IDs
  const setActivePathId = (pathId: string) => {
    setPathState((prev) => ({
      ...prev,
      activePathName: pathId, // Treat name as ID temporarily
      currentPathProgressXP: 0, // Reset progress (Sparks) on switch
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

  // --- Panel Toggle Handler using Context ---
  const handleTogglePanel = useCallback(
    (panelId: PanelId) => {
      if (isToolboxOpen) {
        triggerShakeIndicator();
        showToast({ title: "Please exit edit mode first.", variant: "info" });
        return;
      }
      // If the clicked panel is already open, close it. Otherwise, open it.
      if (openPanelId === panelId) { // Updated condition
        closePanel();
      } else {
        openPanel(panelId);
      }
    },
    [
      isToolboxOpen,
      triggerShakeIndicator,
      showToast,
      openPanelId, // Updated dependency
      openPanel,
      closePanel,
    ]
  );

  const handleToggleToolbox = () => {
    if (isMobileView) {
      showToast({
        title: "Edit mode is disabled on mobile.",
        variant: "info",
      });
      return;
    }
    toggleToolbox();
    // If entering edit mode, close any open panel
    if (!isToolboxOpen) {
      closePanel();
    }
  };

  // Determine if any panel (excluding toolbox) is open using context
  const isAnyPanelOpen = openPanelId !== null;

  // Helper function to get panel class names using context
  const getPanelClasses = (panelId: PanelId, maxWidthClass = "md:max-w-md") =>
    cn(
      "absolute top-0 left-16 bottom-0 transition-transform duration-300 ease-in-out z-20",
      "w-[calc(100vw-4rem)]",
      "md:w-auto",
      maxWidthClass,
      "bg-gray-800 shadow-lg",
      openPanelId === panelId ? "translate-x-0" : "-translate-x-full" // Updated condition
    );

  return (
    <>
      {/* Sidebar Buttons */}
      <aside className="fixed left-0 top-0 bottom-0 z-30 flex h-screen w-16 flex-col items-center border-r border-gray-700 bg-gray-800 py-4">
        {/* Logo Button */}
        <button
          onClick={handleLogoClick}
          title="View Changelog"
          className={`relative mb-6 h-10 w-10 cursor-pointer rounded-lg transition-transform hover:scale-105 p-0 ${
            hasNewChangelog ? "widget-shake" : ""
          }`}
        >
          <img
            src="/icon.png"
            alt="Mango Logo"
            className="h-full w-full object-cover rounded-lg"
          />
          {hasNewChangelog && (
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
            variant={openPanelId === "yuzu" ? "secondary" : "ghost"} // Updated condition
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              openPanelId === "yuzu" ? "text-indigo-400" : "text-gray-400" // Updated condition
            }`}
            onClick={() => handleTogglePanel("yuzu")}
            title="Toggle Yuzu Panel"
          >
            <Bot size={20} />
            <span className="sr-only">Toggle Yuzu</span>
          </Button>

          {/* Quests Button (Added before Paths) - Quests system disabled
          <Button
            variant={openPanelId === "quests" ? "secondary" : "ghost"} // Updated condition
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              openPanelId === "quests" ? "text-indigo-400" : "text-gray-400" // Updated condition
            }`}
            onClick={() => handleTogglePanel("quests")}
            title="Quests"
          >
            <Target size={20} />
            <span className="sr-only">Quests</span>
          </Button>
          */}

          {/* Paths Button */}
          <Button
            variant={openPanelId === "paths" ? "secondary" : "ghost"} // Updated condition
            size="icon"
            className={`h-10 w-10 rounded-lg ${
              openPanelId === "paths" ? "text-indigo-400" : "text-gray-400" // Updated condition
            }`}
            onClick={() => handleTogglePanel("paths")}
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
          {dataSourceConfig.map(
            ({ id, label, IconComponent }) =>
              // Exclude 'quests' from this section as it's now a main nav item
              id !== "quests" && (
                <Button
                  key={id}
                  variant={openPanelId === id ? "secondary" : "ghost"} // Updated condition
                  size="icon"
                  className={`h-10 w-10 rounded-lg ${
                    openPanelId === id ? "text-indigo-400" : "text-gray-400" // Updated condition
                  }`}
                  onClick={() => handleTogglePanel(id)}
                  title={label}
                >
                  <IconComponent size={20} />
                  <span className="sr-only">{label}</span>
                </Button>
              )
          )}
        </nav>

        {/* User Profile Section */}
        <div className="mt-auto flex w-full flex-col items-center gap-1 border-t border-gray-700 pt-3 pb-2">
          <Button
            variant={openPanelId === "userProfile" ? "secondary" : "ghost"} // Updated condition
            size="icon"
            className={`h-9 w-9 rounded-full hover:bg-gray-700 ${
              openPanelId === "userProfile" // Updated condition
                ? "text-indigo-400"
                : "text-gray-400"
            }`}
            onClick={() => handleTogglePanel("userProfile")}
            title="User Profile"
          >
            <User size={18} />
            <span className="sr-only">User Profile</span>
          </Button>
          {/* Display dynamic level and xp */}
          <span className="text-[10px] font-medium text-gray-300">
            Level {level}
          </span>
          <span className="text-[10px] text-gray-400">{xp} XP</span>
        </div>
      </aside>

      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 left-16 z-10 bg-black/50 transition-opacity duration-300",
          isAnyPanelOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={closePanel} // Use context function to close any open panel
        aria-hidden="true"
      />

      {/* Render Panels */}
      <div className={getPanelClasses("yuzu", "md:max-w-md")}>
        <YuzuPanel onClose={closePanel} /> {/* Use context function */}
      </div>
      <div className={getPanelClasses("userProfile", "md:max-w-md")}>
        <UserProfilePanel onClose={closePanel} /> {/* Use context function */}
      </div>
      {/* Render PathsPage within its panel container */}
      <div className={getPanelClasses("paths", "md:max-w-2xl")}>
        {" "}
        {/* Use a wider max-width */}
        <PathsPage
          onClose={closePanel}
          activePathId={activePathName} // Pass name as ID for now
          setActivePathId={setActivePathId} // Pass the renamed function
          // TODO: Replace placeholders with real state/context values
          unlockedRewardIds={new Set<string>()} // Placeholder
          currentPathProgressSparks={currentPathProgressSparks} // Pass renamed state
          onAllocateSparks={() =>
            console.warn("Allocate Sparks action not implemented yet.")
          } // Placeholder
        />
      </div>
      {/* Data Source Panels */}
      <div className={getPanelClasses("calendar", "md:max-w-sm")}>
        <CalendarDataSource onClose={closePanel} /> {/* Use context function */}
      </div>
      <div className={getPanelClasses("health", "md:max-w-sm")}>
        <HealthDataSource onClose={closePanel} /> {/* Use context function */}
      </div>
      <div className={getPanelClasses("todos", "md:max-w-sm")}>
        <TodosDataSource onClose={closePanel} /> {/* Use context function */}
      </div>
      <div className={getPanelClasses("finance", "md:max-w-sm")}>
        <FinanceDataSource onClose={closePanel} /> {/* Use context function */}
      </div>
      <div className={getPanelClasses("habits", "md:max-w-sm")}>
        <HabitsDataSource onClose={closePanel} /> {/* Use context function */}
      </div>
      {/* Quests Panel - Quests system disabled
      <div className={getPanelClasses("quests", "md:max-w-md")}>
        <QuestsPanel onClose={closePanel} />
      </div>
      */}

      {/* Changelog modal */}
      <ChangelogModal
        isOpen={isChangelogOpen}
        onOpenChange={setIsChangelogOpen}
      />
    </>
  );
}
