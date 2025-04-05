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
    setItems, // Only used internally by hook now? Or after save?
    setEditItems, // Function to update edit state
    isLoadingLayout,
    fetchLayout,
    saveEditLayout, // Function to save edits when exiting edit mode
    // updateWidgetConfig is used by DashboardGridItem, not directly here
  } = useDashboardLayout();

  const [isToolboxOpen, setIsToolboxOpen] = useState(false); // True if in edit mode

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

  // --- Initial Load & Focus Handling ---
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
      console.log(
        `Edit mode active for ${editTargetDashboard}. Fetching layout for editing (Force: ${targetChanged}).`
      );
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
      console.log(`Closing toolbox. Saving edits for ${editTargetDashboard}.`);
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
      }
    } else if (nextIsOpen) {
      // --- Opening Toolbox ---
      console.log(
        `Opening toolbox. Setting edit target to: ${currentViewDashboardName}`
      );
      // Set edit target, useEffect will trigger fetch for editing
      setEditTargetDashboard(currentViewDashboardName);
      setIsToolboxOpen(true); // Update state
    } else {
      // Closing toolbox when editItems is already null (e.g., implicit close)
      setIsToolboxOpen(false);
    }
  };

  const toggleEditTarget = () => {
    // This will trigger the useEffect to fetch the new target for editing
    setEditTargetDashboard((prev) =>
      prev === "default" ? "mobile" : "default"
    );
  };
  // --- End Toolbox Toggle Logic ---

  // --- Add Widget Logic ---
  // Updates editItems state directly
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
      console.log(
        `Added ${widgetType} to edit state at x:${position.x}, y:${position.y}`
      );
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

  // --- Layout Change Handlers ---
  // Updates editItems state directly
  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

      // --- Add Logging ---
      console.log("[onLayoutChange] Triggered.");
      console.log(
        "[onLayoutChange] Current editItems state (before update):",
        JSON.stringify(
          editItems.map((i) => ({ id: i.id, x: i.x, y: i.y, w: i.w, h: i.h }))
        )
      );
      console.log(
        "[onLayoutChange] Received layout from RGL:",
        JSON.stringify(
          layout.map((l) => ({ i: l.i, x: l.x, y: l.y, w: l.w, h: l.h }))
        )
      );
      // --- End Logging ---

      // Calculate new layout based on RGL's layout output
      const newEditItems = editItems.map((editItem) => {
        const layoutItem = layout.find((l) => l.i === editItem.id);

        // --- Add Logging ---
        if (layoutItem) {
          console.log(
            `[onLayoutChange] Processing item ${editItem.id}: Found layoutItem (x:${layoutItem.x}, y:${layoutItem.y}, w:${layoutItem.w}, h:${layoutItem.h}). Current editItem (w:${editItem.w}, h:${editItem.h})`
          );
        } else {
          console.warn(
            `[onLayoutChange] Processing item ${editItem.id}: Corresponding layoutItem NOT FOUND in RGL output!`
          );
        }
        // --- End Logging ---

        return layoutItem
          ? {
              ...editItem, // Keep existing properties (like config, type, minW/H)
              x: layoutItem.x, // Update position from RGL
              y: layoutItem.y, // Update position from RGL
              w: layoutItem.w, // Update width from RGL
              h: layoutItem.h, // Update height from RGL
            }
          : editItem; // Should not happen if RGL includes all items
      });

      // --- Add Logging ---
      console.log(
        "[onLayoutChange] Calculated newEditItems (x,y,w,h updated):",
        JSON.stringify(
          newEditItems.map((i) => ({
            id: i.id,
            x: i.x,
            y: i.y,
            w: i.w,
            h: i.h,
          }))
        )
      );
      // --- End Logging ---

      // Check if layout actually changed (position or size)
      let layoutChanged = false;
      if (newEditItems.length !== editItems.length) {
        layoutChanged = true; // Should not happen
        console.warn(
          "[onLayoutChange] Mismatch in item count between editItems and newEditItems!"
        );
      } else {
        for (let i = 0; i < editItems.length; i++) {
          const oldItem = editItems[i];
          const newItem = newEditItems.find((ni) => ni.id === oldItem.id);
          if (
            !newItem ||
            oldItem.x !== newItem.x ||
            oldItem.y !== newItem.y ||
            oldItem.w !== newItem.w || // Check width
            oldItem.h !== newItem.h // Check height
          ) {
            layoutChanged = true;
            break;
          }
        }
      }

      if (layoutChanged) {
        console.log(
          "[onLayoutChange] Layout changed (pos or size). Updating editItems state."
        );
        setEditItems(newEditItems); // Update local edit state ONLY
      } else {
        console.log(
          "[onLayoutChange] No layout change detected. Skipping state update."
        );
      }
    },
    [editItems, setEditItems, isToolboxOpen] // Depend on editItems
  );

  // Updates editItems state directly during resize
  const handleLiveResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

      // Update the edit state immediately during resize
      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null; // Should not happen if isToolboxOpen is true
        return currentEditItems.map((item) =>
          item.id === newItemLayout.i
            ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
            : item
        );
      });
      // NO server save
    },
    [isToolboxOpen, setEditItems] // editItems not needed as dependency for setter fn
  );

  // Updates editItems state directly after resize stops
  // This might be redundant now if onLayoutChange handles size correctly, but keep for safety/clarity
  const handleResizeStop = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

      // Ensure the final size is set in the edit state
      setEditItems((currentEditItems) => {
        if (!currentEditItems) return null;
        const itemExists = currentEditItems.some(
          (item) => item.id === newItemLayout.i
        );
        if (!itemExists) return currentEditItems; // Avoid update if item somehow disappeared

        // --- Add Logging ---
        console.log(
          `[handleResizeStop] Updating item ${newItemLayout.i} size to w:${newItemLayout.w}, h:${newItemLayout.h}`
        );
        // --- End Logging ---

        return currentEditItems.map((item) =>
          item.id === newItemLayout.i
            ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
            : item
        );
      });
      // NO server save
    },
    [isToolboxOpen, setEditItems] // editItems not needed as dependency for setter fn
  );

  // Updates editItems state directly
  const handleDeleteWidget = (idToDelete: string) => {
    if (!isToolboxOpen || editItems === null) return; // Only run in edit mode

    const newEditItems = editItems.filter((item) => item.id !== idToDelete);

    if (newEditItems.length === 0) {
      // If last item deleted, set edit state to default placeholder layout
      setEditItems(getDefaultLayout());
    } else {
      setEditItems(newEditItems);
    }
    // NO server save
  };
  // --- End Layout Change Handlers ---

  // --- Panel Behavior & Styling ---
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
            <DashboardGrid
              items={itemsToDisplay}
              isToolboxOpen={isToolboxOpen}
              isMobileEditMode={isMobileEditMode}
              editTargetDashboard={editTargetDashboard}
              onLayoutChange={onLayoutChange}
              onLiveResize={handleLiveResize}
              handleResizeStop={handleResizeStop}
              handleDeleteWidget={handleDeleteWidget}
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
