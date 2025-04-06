import { useAuth } from "@/contexts/AuthContext";
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
import { getCachedLastSyncTime, isMobileView } from "./dashboard/utils";
import { useToast } from "@/contexts/ToastContext"; // Import useToast
// Removed provider import

// Define props for Dashboard, including PWA update props
interface DashboardProps {
  updateSW: () => void;
  needRefresh: boolean;
}

export function Dashboard({ updateSW, needRefresh }: DashboardProps) {
  const { isLoading: isAuthLoading } = useAuth();
  const { showToast } = useToast(); // Use the toast hook

  // Destructure new state and functions from the hook
  const {
    items, // Display items
    editItems, // Items being edited (or null)
    setEditItems, // Function to update edit state
    isLoadingLayout,
    fetchLayout,
    saveEditLayout, // Function to save edits when exiting edit mode
    // updateWidgetConfig is used by DashboardGridItem, not directly here
  } = useDashboardLayout();

  const [isToolboxOpen, setIsToolboxOpen] = useState(false); // True if in edit mode
  // --- NEW: State to track if any config modal is active ---
  const [isConfigModalActive, setIsConfigModalActive] = useState(false);

  const [currentViewDashboardName, setCurrentViewDashboardName] =
    useState<DashboardName>("default");
  const [editTargetDashboard, setEditTargetDashboard] =
    useState<DashboardName>("default");
  const prevEditTargetRef = useRef<DashboardName>("default");

  const gridContainerRef = useRef<HTMLDivElement>(null);

  const [shakeCount, setShakeCount] = useState(0);
  const triggerShakeIndicator = () => setShakeCount((c) => c + 1);

  const [isSwitchingEditMode, setIsSwitchingEditMode] = useState(false);
  const [isSavingLayout, setIsSavingLayout] = useState(false); // <-- Add state for saving loader

  // --- Initial Load & Focus Handling (remains the same) ---
  useEffect(() => {
    const loadInitial = async () => {
      const isMobile = isMobileView();
      const initialName: DashboardName = isMobile ? "mobile" : "default";
      setCurrentViewDashboardName(initialName);
      setEditTargetDashboard(initialName);
      // Initial fetch populates 'items' state for display
      await fetchLayout(initialName, false, { background: false });
    };
    if (!isAuthLoading) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]); // fetchLayout dependency removed as it changes

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isAuthLoading &&
        !isToolboxOpen // Only fetch on focus if NOT editing
      ) {
        const lastSyncTime = getCachedLastSyncTime();
        if (!lastSyncTime || Date.now() - lastSyncTime > CACHE_STALE_DURATION) {
          // Background fetch updates 'items' state if different
          fetchLayout(currentViewDashboardName, true, { background: true });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthLoading, currentViewDashboardName, fetchLayout, isToolboxOpen]);

  // Fetch layout specifically for editing when toolbox opens or target changes
  useEffect(() => {
    if (isToolboxOpen && !isAuthLoading) {
      const previousTarget = prevEditTargetRef.current;
      const targetChanged = previousTarget !== editTargetDashboard;

      // Fetch layout for editing, populating 'editItems'
      setIsSwitchingEditMode(targetChanged); // Show loader only if target changed
      fetchLayout(editTargetDashboard, targetChanged, { forEditing: true }) // Use forEditing flag
        .finally(() => setIsSwitchingEditMode(false));
    }
    prevEditTargetRef.current = editTargetDashboard;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTargetDashboard, isToolboxOpen, isAuthLoading]); // fetchLayout dependency removed
  // --- End Initial Load & Focus Handling ---

  // --- Toolbox Toggle Logic ---
  const toggleToolbox = async (forceState?: boolean) => {
    const nextIsOpen = forceState !== undefined ? forceState : !isToolboxOpen;

    if (!nextIsOpen && editItems) {
      // --- Closing Toolbox: Save Edits ---
      setIsSavingLayout(true); // <-- Set saving state to true
      try {
        const saveSuccess = await saveEditLayout(editTargetDashboard); // saveEditLayout now updates 'items' and clears 'editItems'
        if (!saveSuccess) {
          showToast({
            title: "Save Failed",
            description: "Could not save dashboard changes. Please try again.",
            variant: "destructive",
          });
          // Optionally: Keep toolbox open or revert changes? For now, just warn.
        }
      } catch (error) {
        console.error("Error during saveEditLayout:", error);
        showToast({
          title: "Save Error",
          description: "An unexpected error occurred while saving.",
          variant: "destructive",
        });
      } finally {
        // Set view back to default after saving (or attempting save)
        const viewTarget: DashboardName = "default";
        setCurrentViewDashboardName(viewTarget);
        setEditTargetDashboard(viewTarget); // Reset edit target for next time
        setIsToolboxOpen(false); // Update state after async operation
        setIsSavingLayout(false); // <-- Set saving state back to false
        setIsConfigModalActive(false); // Ensure config modal state is reset on exit
      }
    } else if (nextIsOpen) {
      // --- Opening Toolbox ---
      // Set edit target, useEffect will trigger fetch for editing
      setEditTargetDashboard(currentViewDashboardName);
      setIsToolboxOpen(true); // Update state
    } else {
      // Closing toolbox when editItems is already null (e.g., implicit close)
      setIsToolboxOpen(false);
      setIsConfigModalActive(false); // Ensure config modal state is reset
    }
  };

  const toggleEditTarget = () => {
    // This will trigger the useEffect to fetch the new target for editing
    setEditTargetDashboard((prev) =>
      prev === "default" ? "mobile" : "default"
    );
  };
  // --- End Toolbox Toggle Logic ---

  // --- NEW: Callback for config modal open/close ---
  const handleConfigModalToggle = (isOpen: boolean) => {
    setIsConfigModalActive(isOpen);
  };
  // --- End Callback ---

  // --- Add Widget Logic (remains the same) ---
  const handleAddWidget = (widgetType: WidgetType) => {
    if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

    const widgetDefaults = defaultWidgetLayouts[widgetType] || {
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
    };
    const { w, h, minW = 2, minH = 2 } = widgetDefaults;

    const cols =
      editTargetDashboard === "mobile" ? mobileCols.mobile : standardCols.lg;

    // Operate on editItems
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
        // Add empty config if needed? Or let widgets handle default?
        // config: {}
      };
      const newEditItems = [...currentFilteredItems, newItem];
      setEditItems(newEditItems); // Update local edit state ONLY
    } else {
      console.warn(`Could not find space for ${widgetType}`);
      showToast({
        title: "Dashboard Full",
        description: `Could not find an available space for the ${widgetType} widget.`,
        variant: "destructive",
      });
    }
  };

  // Helper for add widget (remains the same)
  const findFirstAvailablePosition = (
    widgetMinW: number,
    widgetMinH: number,
    currentItems: GridItem[],
    cols: number
  ): { x: number; y: number } | null => {
    let maxY = 0;
    currentItems.forEach((item) => {
      maxY = Math.max(maxY, item.y + item.h);
    });

    for (let y = 0; y <= maxY; y++) {
      for (let x = 0; x <= cols - widgetMinW; x++) {
        let collision = false;
        for (const item of currentItems) {
          const newItemRight = x + widgetMinW;
          const newItemBottom = y + widgetMinH;
          const existingItemRight = item.x + item.w;
          const existingItemBottom = item.y + item.h;

          if (
            !(
              newItemRight <= item.x ||
              x >= existingItemRight ||
              newItemBottom <= item.y ||
              y >= existingItemBottom
            )
          ) {
            collision = true;
            break;
          }
        }
        if (!collision) return { x, y };
      }
    }
    return { x: 0, y: maxY };
  };
  // --- End Add Widget Logic ---

  // --- Layout Change Handlers (remain the same) ---
  // Updates editItems state directly
  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

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
    [editItems, setEditItems, isToolboxOpen]
  );

  // Updates editItems state directly during resize
  const handleLiveResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null;
        return currentEditItems.map((item) =>
          item.id === newItemLayout.i
            ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
            : item
        );
      });
    },
    [isToolboxOpen, setEditItems]
  );

  // Updates editItems state directly after resize stops
  const handleResizeStop = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

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
    [isToolboxOpen, setEditItems]
  );

  // Updates editItems state directly
  const handleDeleteWidget = (idToDelete: string) => {
    if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

    const newEditItems = editItems.filter((item) => item.id !== idToDelete);

    if (newEditItems.length === 0) {
      setEditItems(getDefaultLayout());
    } else {
      setEditItems(newEditItems);
    }
  };
  // --- End Layout Change Handlers ---

  // --- Panel Behavior & Styling (remains the same) ---
  const mainContentPaddingLeft = isToolboxOpen ? "pl-64" : "pl-0";
  const isMobileEditMode = isToolboxOpen && editTargetDashboard === "mobile";

  // Determine which items to display
  const itemsToDisplay = isToolboxOpen && editItems ? editItems : items;

  // --- Render Logic ---
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Show loader if loading initial display OR if loading edit state (editItems is null)
  if (isLoadingLayout && itemsToDisplay.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 pl-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 pl-16">
      <LeftSidebar
        isToolboxOpen={isToolboxOpen}
        toggleToolbox={toggleToolbox}
        triggerShakeIndicator={triggerShakeIndicator}
      />

      <div className="flex flex-col flex-1 overflow-hidden">
        <PomodoroBanner />
        <DashboardHeader updateSW={updateSW} needRefresh={needRefresh} />

        <div className="flex-1 relative overflow-hidden w-full">
          <main
            ref={gridContainerRef}
            className={cn(
              `absolute inset-0 bg-gray-950 overflow-auto transition-padding duration-300 ease-in-out`,
              mainContentPaddingLeft,
              isMobileEditMode && "flex justify-center items-start pt-4"
            )}
          >
            {/* Pass itemsToDisplay (either items or editItems) */}
            {/* --- Pass NEW props to DashboardGrid --- */}
            {/* Removed provider wrap */}
            <DashboardGrid
              items={itemsToDisplay}
              isToolboxOpen={isToolboxOpen}
              isMobileEditMode={isMobileEditMode}
              editTargetDashboard={editTargetDashboard}
              onLayoutChange={onLayoutChange}
              onLiveResize={handleLiveResize}
              handleResizeStop={handleResizeStop}
              handleDeleteWidget={handleDeleteWidget}
              isConfigModalActive={isConfigModalActive} // Pass state down
              onConfigModalToggle={handleConfigModalToggle} // Pass callback down
            />
            {/* Loader specifically for switching edit targets */}
            {isSwitchingEditMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-50 z-30">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
            {/* Loader for saving layout */}
            {isSavingLayout && (
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

          {/* Toolbox remains the same */}
          <div
            className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
              isToolboxOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <WidgetToolbox
              onClose={() => toggleToolbox(false)}
              editTargetDashboard={editTargetDashboard}
              onAddWidget={handleAddWidget}
            />
          </div>
        </div>
      </div>

      {/* EditModeIndicator remains the same */}
      <EditModeIndicator
        isToolboxOpen={isToolboxOpen}
        editTargetDashboard={editTargetDashboard}
        toggleEditTarget={toggleEditTarget}
        toggleToolbox={() => toggleToolbox()} // Pass simple toggle
        shakeCount={shakeCount}
      />
    </div>
  );
}
