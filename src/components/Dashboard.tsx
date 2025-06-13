import { useAuthStore } from "@/stores/authStore";
// Update imports to point to correct config files
import { WidgetType, defaultWidgetLayouts } from "@/lib/widgetConfig";
import { GridItem } from "@/lib/dashboardConfig"; // Keep GridItem import
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react";
import { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardHeader } from "./DashboardHeader";
import { LeftSidebar } from "./LeftSidebar";
import { WidgetToolbox } from "./WidgetToolbox";
import { PomodoroBanner } from "./PomodoroBanner"; // Import the banner
import { NotificationsPanel } from "./NotificationsPanel"; // Import the panel

// Import refactored modules
import { DashboardGrid } from "./dashboard/components/DashboardGrid";
import { EditModeIndicator } from "./dashboard/components/EditModeIndicator";
import {
  CACHE_STALE_DURATION,
  getDefaultLayout,
  standardCols, // Import grid columns
  mobileCols, // Import grid columns
} from "./dashboard/constants";
import { useDashboardLayout } from "./dashboard/hooks/useDashboardLayout";
import { DashboardName } from "./dashboard/types";
import {
  getCachedLastSyncTime,
  isMobileView,
  findFirstAvailablePosition, // Import the utility function
} from "./dashboard/utils";
import { useToastStore } from "@/stores/toastStore"; // Import useToastStore
// Removed provider import

// Define props for Dashboard, including PWA update props
interface DashboardProps {
  updateSW: () => void;
  needRefresh: boolean;
}

export function Dashboard({ updateSW, needRefresh }: DashboardProps) {
  const { isLoading: isAuthLoading } = useAuthStore();
  const { showToast } = useToastStore(); // Use the toast hook

  // Destructure new state and functions from the hook
  const {
    items, // Display items
    editItems, // Items being edited (or null)
    setEditItems, // Function to update edit state directly (e.g., DnD)
    isLoadingLayout,
    fetchLayout,
    // updateWidgetConfig is used by DashboardGridItem
    // New state and controls from the hook:
    isEditing,
    editTarget,
    isSaving,
    isSwitchingTarget,
    startEditing,
    stopEditing,
    switchEditTarget,
  } = useDashboardLayout();

  // Removed isToolboxOpen state
  const [isConfigModalActive, setIsConfigModalActive] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false); // State for notification panel

  const [currentViewDashboardName, setCurrentViewDashboardName] =
    useState<DashboardName>("default");
  // Removed editTargetDashboard state (now 'editTarget' from hook)
  // Removed prevEditTargetRef (managed within hook if needed)

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [shakeCount, setShakeCount] = useState(0);
  const triggerShakeIndicator = () => setShakeCount((c) => c + 1);

  // Removed isSwitchingEditMode state (now 'isSwitchingTarget' from hook)
  // Removed isSavingLayout state (now 'isSaving' from hook)

  // --- Initial Load & Focus Handling ---
  useEffect(() => {
    const loadInitial = async () => {
      const isMobile = isMobileView();
      const initialName: DashboardName = isMobile ? "mobile" : "default";
      setCurrentViewDashboardName(initialName);
      // setEditTargetDashboard(initialName); // Removed - editTarget is managed by hook
      await fetchLayout(initialName, false, { background: false });
    };
    if (!isAuthLoading) {
      loadInitial();
    }
  }, [isAuthLoading, fetchLayout]); // Added fetchLayout dependency

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isAuthLoading &&
        !isEditing // Use isEditing from hook
      ) {
        const lastSyncTime = getCachedLastSyncTime();
        if (!lastSyncTime || Date.now() - lastSyncTime > CACHE_STALE_DURATION) {
          fetchLayout(currentViewDashboardName, true, { background: true });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthLoading, currentViewDashboardName, fetchLayout, isEditing]); // Use isEditing from hook

  // Removed useEffect for fetching on edit mode start (handled by startEditing in hook)

  // --- End Initial Load & Focus Handling ---

  // --- Edit Mode Toggle Logic ---
  const handleToggleEditMode = async () => {
    if (isEditing) {
      // Attempt to save and exit edit mode
      const success = await stopEditing();
      if (success) {
        // Reset view to default after successful save/exit
        setCurrentViewDashboardName("default");
        setIsConfigModalActive(false); // Close config modal on exit
      }
      // If stopEditing fails, it handles showing toast and keeps isEditing true
    } else {
      // Enter edit mode
      startEditing(currentViewDashboardName); // Start editing the currently viewed dashboard
      setIsConfigModalActive(false); // Ensure config modal is closed on entry
    }
  };

  // --- Edit Target Toggle Logic ---
  const handleToggleEditTarget = () => {
    // Use the hook's function to switch the target being edited
    const newTarget = editTarget === "default" ? "mobile" : "default";
    switchEditTarget(newTarget);
  };
  // --- End Edit Mode Toggle Logic ---

  // --- Notification Panel Toggle Logic ---
  const handleToggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
  };
  // --- End Notification Panel Toggle Logic ---

  // --- Config Modal Toggle Logic ---
  const handleConfigModalToggle = (isOpen: boolean) => {
    setIsConfigModalActive(isOpen);
  };
  // --- End Config Modal Toggle Logic ---

  // --- Add Widget Logic ---
  const handleAddWidget = (widgetType: WidgetType) => {
    if (!isEditing || editItems === null) return; // Use isEditing
    const widgetDefaults = defaultWidgetLayouts[widgetType] || {
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
    };
    const { w, h, minW = 2, minH = 2 } = widgetDefaults;
    const cols = editTarget === "mobile" ? mobileCols.mobile : standardCols.lg; // Use editTarget
    const isPlaceholderPresent = editItems.some(
      (item) => item.type === "Placeholder"
    );
    const currentFilteredItems = isPlaceholderPresent
      ? editItems.filter((item) => item.type !== "Placeholder")
      : editItems;
    const position = findFirstAvailablePosition(
      minW,
      minH,
      currentFilteredItems,
      cols
    );
    if (position) {
      const newItem: GridItem = {
        id: nanoid(),
        type: widgetType,
        x: position.x,
        y: position.y,
        w: w,
        h: h,
        minW: minW,
        minH: minH,
      };
      const newEditItems = [...currentFilteredItems, newItem];
      setEditItems(newEditItems);
    } else {
      console.warn(`Could not find space for ${widgetType}`);
      showToast({
        title: "Dashboard Full",
        description: `Could not find an available space for the ${widgetType} widget.`,
        variant: "destructive",
      });
    }
  };

  // Removed findFirstAvailablePosition function definition from here

  // --- End Add Widget Logic ---

  // --- Layout Change Handlers ---
  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!isEditing || editItems === null) return; // Use isEditing
      const newEditItems = editItems.map((editItem) => {
        const layoutItem = layout.find((l) => l.i === editItem.id);
        return layoutItem
          ? {
              ...editItem,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          : editItem;
      });
      let layoutChanged = false;
      if (newEditItems.length !== editItems.length) {
        layoutChanged = true;
      } else {
        for (let i = 0; i < editItems.length; i++) {
          const oldItem = editItems[i];
          const newItem = newEditItems.find((ni) => ni.id === oldItem.id);
          if (
            !newItem ||
            oldItem.x !== newItem.x ||
            oldItem.y !== newItem.y ||
            oldItem.w !== newItem.w ||
            oldItem.h !== newItem.h
          ) {
            layoutChanged = true;
            break;
          }
        }
      }
      if (layoutChanged) {
        setEditItems(newEditItems);
      }
    },
    [editItems, setEditItems, isEditing] // Use isEditing
  );

  const handleLiveResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isEditing || editItems === null) return; // Use isEditing
      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null;
        return currentEditItems.map((item) =>
          item.id === newItemLayout.i
            ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
            : item
        );
      });
    },
    [isEditing, setEditItems] // Use isEditing
  );

  const handleResizeStop = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isEditing || editItems === null) return; // Use isEditing
      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null;
        const itemExists = currentEditItems.some(
          (item) => item.id === newItemLayout.i
        );
        if (!itemExists) return currentEditItems;
        return currentEditItems.map((item) =>
          item.id === newItemLayout.i
            ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
            : item
        );
      });
    },
    [isEditing, setEditItems] // Use isEditing
  );

  const handleDeleteWidget = (idToDelete: string) => {
    if (!isEditing || editItems === null) return; // Use isEditing
    const newEditItems = editItems.filter((item) => item.id !== idToDelete);
    if (newEditItems.length === 0) {
      setEditItems(getDefaultLayout());
    } else {
      setEditItems(newEditItems);
    }
  };
  // --- End Layout Change Handlers ---

  // --- Panel Behavior & Styling ---
  const mainContentPaddingLeft = isEditing ? "pl-64" : "pl-0"; // Use isEditing
  const isMobileEditMode = isEditing && editTarget === "mobile"; // Use isEditing and editTarget
  const itemsToDisplay = isEditing && editItems ? editItems : items; // Use isEditing
  // --- End Panel Behavior & Styling ---

  // --- Render Logic ---
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }
  if (isLoadingLayout && itemsToDisplay.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 pl-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 pl-16 relative">
      {" "}
      {/* Add relative positioning for panel */}
      <LeftSidebar
        isToolboxOpen={isEditing} // Pass isEditing
        toggleToolbox={handleToggleEditMode} // Pass new handler
        triggerShakeIndicator={triggerShakeIndicator}
      />
      <div className="flex flex-col flex-1 overflow-hidden">
        <PomodoroBanner />
        {/* Pass the toggle function to the header */}
        <DashboardHeader
          updateSW={updateSW}
          needRefresh={needRefresh}
          onToggleNotifications={handleToggleNotifications}
        />

        <div className="flex-1 relative overflow-hidden w-full">
          <main
            ref={gridContainerRef}
            className={cn(
              `absolute inset-0 bg-gray-950 overflow-auto transition-padding duration-300 ease-in-out`,
              mainContentPaddingLeft,
              isMobileEditMode && "flex justify-center items-start pt-4"
            )}
          >
            <DashboardGrid
              items={itemsToDisplay}
              isToolboxOpen={isEditing} // Use isEditing
              isMobileEditMode={isMobileEditMode}
              editTargetDashboard={editTarget} // Use editTarget
              onLayoutChange={onLayoutChange}
              onLiveResize={handleLiveResize}
              handleResizeStop={handleResizeStop}
              handleDeleteWidget={handleDeleteWidget}
              isConfigModalActive={isConfigModalActive}
              onConfigModalToggle={handleConfigModalToggle}
            />
            {isSwitchingTarget && ( // Use isSwitchingTarget
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-50 z-30">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            {isSaving && ( // Use isSaving
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-75 z-40">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
                  <span className="text-sm text-gray-300">
                    Saving Layout...
                  </span>
                </div>
              </div>
            )}
          </main>

          <div
            className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
              isEditing ? "translate-x-0" : "-translate-x-full" // Use isEditing
            }`}
          >
            <WidgetToolbox
              onClose={() => handleToggleEditMode()} // Use new handler to exit
              editTargetDashboard={editTarget} // Use editTarget
              onAddWidget={handleAddWidget}
            />
          </div>
        </div>
      </div>
      <EditModeIndicator
        isToolboxOpen={isEditing} // Use isEditing
        editTargetDashboard={editTarget} // Use editTarget
        toggleEditTarget={handleToggleEditTarget} // Use new handler
        toggleToolbox={handleToggleEditMode} // Use new handler
        shakeCount={shakeCount}
      />
      {/* Conditionally render NotificationsPanel, positioned relative to the main div */}
      {isNotificationsOpen && (
        <div className="absolute top-0 right-0 h-full z-30 shadow-xl">
          {" "}
          {/* Adjust z-index as needed */}
          <NotificationsPanel onClose={() => setIsNotificationsOpen(false)} />
        </div>
      )}
    </div>
  );
}
