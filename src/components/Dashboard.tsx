import { useAuth } from "@/contexts/AuthContext";
import { WidgetType, defaultWidgetLayouts } from "@/lib/dashboardConfig"; // Import config
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Loader2 } from "lucide-react";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useRef, useState } from "react"; // Added useRef
import { Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardHeader } from "./DashboardHeader";
import { Droppable } from "./Droppable";
import { LeftSidebar } from "./LeftSidebar";
import { WidgetPreview } from "./WidgetPreview";
import { WidgetToolbox } from "./WidgetToolbox";

// Import refactored modules
import { DashboardGrid } from "./dashboard/components/DashboardGrid";
import { EditModeIndicator } from "./dashboard/components/EditModeIndicator";
import { CACHE_STALE_DURATION, getDefaultLayout } from "./dashboard/constants";
import { useDashboardLayout } from "./dashboard/hooks/useDashboardLayout";
import { DashboardName } from "./dashboard/types"; // SavedPathState no longer needed here
import { getCachedLastSyncTime } from "./dashboard/utils";

export function Dashboard() {
  const { isLoading: isAuthLoading } = useAuth(); // Get auth loading state

  // Use the custom hook for layout management
  const {
    items,
    setItems,
    isLoadingLayout, // Still used for initial load
    // isBackgroundFetching, // Can be used for subtle indicators if needed later
    fetchLayout,
    saveLayoutToServer,
  } = useDashboardLayout();
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  // State for view/edit targets remains
  const [currentViewDashboardName, setCurrentViewDashboardName] =
    useState<DashboardName>("default");
  const [editTargetDashboard, setEditTargetDashboard] =
    useState<DashboardName>("default");
  const prevEditTargetRef = useRef<DashboardName>("default"); // Ref to track previous edit target

  // State for DnD remains
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // State for shaking the edit mode indicator
  const [shakeCount, setShakeCount] = useState(0);
  const triggerShakeIndicator = () => setShakeCount((c) => c + 1);

  // State for loader when switching between desktop/mobile edit modes
  const [isSwitchingEditMode, setIsSwitchingEditMode] = useState(false);

  // --- Initial Load & Focus Handling ---
  useEffect(() => {
    const loadInitial = async () => {
      const isMobile = window.innerWidth < 768;
      const initialName: DashboardName = isMobile ? "mobile" : "default";
      setCurrentViewDashboardName(initialName);
      setEditTargetDashboard(initialName);
      // Initial fetch is NOT background
      await fetchLayout(initialName, false, { background: false });
    };
    if (!isAuthLoading) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]); // fetchLayout removed as it's called inside

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isAuthLoading &&
        !isToolboxOpen
      ) {
        const lastSyncTime = getCachedLastSyncTime();
        if (!lastSyncTime || Date.now() - lastSyncTime > CACHE_STALE_DURATION) {
          // Fetch on focus should be background
          fetchLayout(currentViewDashboardName, true, { background: true });
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthLoading, currentViewDashboardName, fetchLayout, isToolboxOpen]);

  useEffect(() => {
    // Fetch layout for the target being edited when toolbox opens or target changes
    if (isToolboxOpen && !isAuthLoading) {
      const previousTarget = prevEditTargetRef.current;
      const targetChanged = previousTarget !== editTargetDashboard;

      if (targetChanged) {
        // Switching between desktop/mobile edit view - show loader
        console.log(
          `Edit target changed from ${previousTarget} to ${editTargetDashboard}. Fetching with loader.`
        );
        setIsSwitchingEditMode(true);
        fetchLayout(editTargetDashboard, true, { background: false }).finally(
          () => setIsSwitchingEditMode(false)
        );
      } else {
        // Just opening toolbox or target hasn't changed - fetch without specific loader (hook handles initial load state)
        console.log(
          `Toolbox opened or target ${editTargetDashboard} unchanged. Fetching.`
        );
        // Fetch non-background on initial toolbox open to ensure latest data is shown for editing
        fetchLayout(editTargetDashboard, true, { background: false });
      }
    }
    // Update ref *after* comparison
    prevEditTargetRef.current = editTargetDashboard;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTargetDashboard, isToolboxOpen, isAuthLoading]); // fetchLayout removed as it's called inside
  // --- End Initial Load & Focus Handling ---

  // --- Only Toolbox Toggle Logic Remains ---
  const toggleToolbox = (forceState?: boolean) => {
    setIsToolboxOpen((prev) => {
      const nextIsOpen = forceState !== undefined ? forceState : !prev;

      if (nextIsOpen) {
        // --- OPENING TOOLBOX ---
        console.log(
          `Opening toolbox. Setting edit target to: ${currentViewDashboardName}`
        );
        setEditTargetDashboard(currentViewDashboardName); // Set edit target to current view
        // Fetching is handled by the useEffect watching editTargetDashboard and isToolboxOpen
      } else {
        // --- CLOSING TOOLBOX ---
        // ALWAYS reset state to default view when closing toolbox
        const viewTarget: DashboardName = "default";
        setCurrentViewDashboardName(viewTarget);
        setEditTargetDashboard(viewTarget);

        if (forceState === false) {
          // Closed because another panel opened (called with forceState=false)
          console.log(
            `Toolbox closed implicitly. Set view to ${viewTarget}. (No fetch)`
          );
          // Only update the state (already done above), don't fetch
        } else {
          // Closed explicitly by user (forceState is undefined)
          console.log(
            `Toolbox closed explicitly. Set view to ${viewTarget} and fetching background.`
          );
          // Fetch default layout in background when closing toolbox
          fetchLayout(viewTarget, true, { background: true });
        }
      }
      return nextIsOpen; // Return the new state for isToolboxOpen
    });
  };

  const toggleEditTarget = () => {
    // This only changes which layout is *previewed* in edit mode
    setEditTargetDashboard((prev) =>
      prev === "default" ? "mobile" : "default"
    );
    // The useEffect watching editTargetDashboard and isToolboxOpen handles fetching & loader
  };

  // --- DnD Handlers (Remain the same) ---
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "toolbox-item") {
      setActiveWidget(event.active.id as WidgetType);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWidget(null);

    if (
      active.data.current?.type === "toolbox-item" &&
      over?.id === "dashboard-grid"
    ) {
      const widgetType = active.id as WidgetType;
      const defaultLayout = defaultWidgetLayouts[widgetType];
      const isPlaceholderPresent = items.some(
        (item) => item.type === "Placeholder"
      );
      const filteredItems = isPlaceholderPresent
        ? items.filter((item) => item.type !== "Placeholder")
        : items;

      let gridX = 0;
      let gridY = Infinity;
      const cols = editTargetDashboard === "mobile" ? 4 : 24;
      const isMobileEditMode =
        isToolboxOpen && editTargetDashboard === "mobile";

      if (
        gridContainerRef.current &&
        event.activatorEvent instanceof PointerEvent
      ) {
        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const sidebarWidth = 64;
        const relativeX =
          event.activatorEvent.clientX - gridRect.left - sidebarWidth;
        const relativeY = event.activatorEvent.clientY - gridRect.top;

        const rowHeight = 30;
        const margin: [number, number] = [10, 10];
        const containerPadding: [number, number] = [15, 15];
        const panelWidth = isToolboxOpen ? 256 : 0;
        const adjustedX = relativeX - containerPadding[0] - panelWidth;
        const adjustedY = relativeY - containerPadding[1];

        const gridWidth = isMobileEditMode
          ? 320
          : gridRect.width -
            sidebarWidth -
            containerPadding[0] * 2 -
            panelWidth;

        const approxCellWidth = gridWidth / cols;
        gridX = Math.max(
          0,
          Math.min(
            cols - (defaultLayout?.w || 6),
            Math.floor(adjustedX / approxCellWidth)
          )
        );
        gridY = Math.max(0, Math.floor(adjustedY / (rowHeight + margin[1])));
      }

      const newItem = {
        id: nanoid(),
        type: widgetType,
        x: gridX,
        y: gridY,
        ...(defaultLayout || { w: 6, h: 4, minW: 2, minH: 2 }),
      };
      const newItems = [...filteredItems, newItem];
      setItems(newItems);
      saveLayoutToServer(newItems, editTargetDashboard);
    }
  };
  // --- End DnD Handlers ---

  // --- Layout Change Handlers (Remain the same) ---
  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
      if (!isToolboxOpen) return;
      const newItems = items.map((item) => {
        const layoutItem = layout.find((l) => l.i === item.id);
        return layoutItem
          ? {
              ...item,
              x: layoutItem.x,
              y: layoutItem.y,
              w: layoutItem.w,
              h: layoutItem.h,
            }
          : item;
      });
      let changed = items.length !== newItems.length;
      if (!changed) {
        for (let i = 0; i < items.length; i++) {
          const oldItem = items[i];
          const newItem = newItems.find((ni) => ni.id === oldItem.id);
          if (
            !newItem ||
            oldItem.x !== newItem.x ||
            oldItem.y !== newItem.y ||
            oldItem.w !== newItem.w ||
            oldItem.h !== newItem.h
          ) {
            changed = true;
            break;
          }
        }
      }
      if (changed) {
        setItems(newItems);
        saveLayoutToServer(newItems, editTargetDashboard);
      }
    },
    [items, setItems, saveLayoutToServer, isToolboxOpen, editTargetDashboard]
  );

  const handleResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      if (!isToolboxOpen) return;
      const newItems = items.map((item) =>
        item.id === newItemLayout.i
          ? { ...item, w: newItemLayout.w, h: newItemLayout.h }
          : item
      );
      const originalItem = items.find((item) => item.id === newItemLayout.i);
      if (
        originalItem &&
        (originalItem.w !== newItemLayout.w ||
          originalItem.h !== newItemLayout.h)
      ) {
        setItems(newItems);
        saveLayoutToServer(newItems, editTargetDashboard);
      }
    },
    [items, setItems, saveLayoutToServer, isToolboxOpen, editTargetDashboard]
  );

  const handleDeleteWidget = (idToDelete: string) => {
    if (!isToolboxOpen) return;
    const newItems = items.filter((item) => item.id !== idToDelete);
    const targetDashboard = editTargetDashboard;
    if (newItems.length === 0) {
      const placeholderItems = getDefaultLayout();
      setItems(placeholderItems);
      saveLayoutToServer(placeholderItems, targetDashboard);
    } else {
      setItems(newItems);
      saveLayoutToServer(newItems, targetDashboard);
    }
  };
  // --- End Layout Change Handlers ---

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // --- Panel Behavior & Styling ---
  const mainContentPaddingLeft = isToolboxOpen ? "pl-64" : "pl-0";
  const isMobileEditMode = isToolboxOpen && editTargetDashboard === "mobile";

  // --- Render Logic ---
  if (isAuthLoading) {
    // Loader for initial auth check
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Loader for initial layout fetch (after auth)
  if (isLoadingLayout && items.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950 pl-16">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      <div className="flex h-screen bg-gray-950 text-gray-100 pl-16">
        {/* Left Sidebar - Pass shake trigger */}
        <LeftSidebar
          isToolboxOpen={isToolboxOpen}
          toggleToolbox={toggleToolbox}
          triggerShakeIndicator={triggerShakeIndicator} // Pass down the function
        />

        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Header */}
          <DashboardHeader />

          <div className="flex-1 relative overflow-hidden w-full">
            {/* Dashboard Grid Area */}
            <Droppable id="dashboard-grid">
              <main
                ref={gridContainerRef}
                className={cn(
                  `absolute inset-0 bg-gray-950 overflow-auto transition-padding duration-300 ease-in-out`,
                  mainContentPaddingLeft,
                  isMobileEditMode && "flex justify-center items-start pt-4"
                )}
              >
                {/* Removed main isLoadingLayout check here */}
                <DashboardGrid
                  items={items}
                  isToolboxOpen={isToolboxOpen}
                  isMobileEditMode={isMobileEditMode}
                  editTargetDashboard={editTargetDashboard}
                  onLayoutChange={onLayoutChange}
                  handleResize={handleResize}
                  handleDeleteWidget={handleDeleteWidget}
                />
                {/* Loader specifically for switching edit modes */}
                {isSwitchingEditMode && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-50 z-30">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                )}
              </main>
            </Droppable>

            {/* Sliding Panels Container */}
            {/* Toolbox - Remains here */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isToolboxOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <WidgetToolbox
                onClose={() => toggleToolbox(false)} // Use simplified close
                editTargetDashboard={editTargetDashboard}
              />
            </div>
            {/* Other Panels are now rendered inside LeftSidebar */}
          </div>
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? <WidgetPreview type={activeWidget} /> : null}
        </DragOverlay>

        {/* Floating Edit Mode Indicator - Pass shake count */}
        <EditModeIndicator
          isToolboxOpen={isToolboxOpen}
          editTargetDashboard={editTargetDashboard}
          toggleEditTarget={toggleEditTarget}
          toggleToolbox={() => toggleToolbox()} // Pass simple toggle
          shakeCount={shakeCount} // Pass down the count
        />
      </div>
    </DndContext>
  );
}
