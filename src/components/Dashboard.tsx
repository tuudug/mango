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

  const { items, setItems, isLoadingLayout, fetchLayout, saveLayoutToServer } =
    useDashboardLayout();
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);

  const [currentViewDashboardName, setCurrentViewDashboardName] =
    useState<DashboardName>("default");
  const [editTargetDashboard, setEditTargetDashboard] =
    useState<DashboardName>("default");
  const prevEditTargetRef = useRef<DashboardName>("default");

  const gridContainerRef = useRef<HTMLDivElement>(null); // Keep ref if needed for other calculations

  const [shakeCount, setShakeCount] = useState(0);
  const triggerShakeIndicator = () => setShakeCount((c) => c + 1);

  const [isSwitchingEditMode, setIsSwitchingEditMode] = useState(false);

  // --- Initial Load & Focus Handling (remains the same) ---
  useEffect(() => {
    const loadInitial = async () => {
      const isMobile = isMobileView();
      const initialName: DashboardName = isMobile ? "mobile" : "default";
      setCurrentViewDashboardName(initialName);
      setEditTargetDashboard(initialName);
      await fetchLayout(initialName, false, { background: false });
    };
    if (!isAuthLoading) {
      loadInitial();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthLoading]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === "visible" &&
        !isAuthLoading &&
        !isToolboxOpen
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
  }, [isAuthLoading, currentViewDashboardName, fetchLayout, isToolboxOpen]);

  useEffect(() => {
    if (isToolboxOpen && !isAuthLoading) {
      const previousTarget = prevEditTargetRef.current;
      const targetChanged = previousTarget !== editTargetDashboard;

      if (targetChanged) {
        console.log(
          `Edit target changed from ${previousTarget} to ${editTargetDashboard}. Fetching with loader.`
        );
        setIsSwitchingEditMode(true);
        fetchLayout(editTargetDashboard, true, { background: false }).finally(
          () => setIsSwitchingEditMode(false)
        );
      } else {
        console.log(
          `Toolbox opened or target ${editTargetDashboard} unchanged. Fetching.`
        );
        fetchLayout(editTargetDashboard, true, { background: false });
      }
    }
    prevEditTargetRef.current = editTargetDashboard;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTargetDashboard, isToolboxOpen, isAuthLoading]);
  // --- End Initial Load & Focus Handling ---

  // --- Toolbox Toggle Logic (remains the same) ---
  const toggleToolbox = (forceState?: boolean) => {
    setIsToolboxOpen((prev) => {
      const nextIsOpen = forceState !== undefined ? forceState : !prev;
      if (nextIsOpen) {
        console.log(
          `Opening toolbox. Setting edit target to: ${currentViewDashboardName}`
        );
        setEditTargetDashboard(currentViewDashboardName);
      } else {
        const viewTarget: DashboardName = "default";
        setCurrentViewDashboardName(viewTarget);
        setEditTargetDashboard(viewTarget);
        if (forceState === false) {
          console.log(
            `Toolbox closed implicitly. Set view to ${viewTarget}. (No fetch)`
          );
        } else {
          console.log(
            `Toolbox closed explicitly. Set view to ${viewTarget} and fetching background.`
          );
          fetchLayout(viewTarget, true, { background: true });
        }
      }
      return nextIsOpen;
    });
  };

  const toggleEditTarget = () => {
    setEditTargetDashboard((prev) =>
      prev === "default" ? "mobile" : "default"
    );
  };
  // --- End Toolbox Toggle Logic ---

  // --- Add Widget Logic (remains the same) ---
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

  const handleAddWidget = (widgetType: WidgetType) => {
    if (!isToolboxOpen) return;

    const widgetDefaults = defaultWidgetLayouts[widgetType] || {
      w: 6,
      h: 4,
      minW: 2,
      minH: 2,
    };
    const { w, h, minW = 2, minH = 2 } = widgetDefaults;

    const cols =
      editTargetDashboard === "mobile" ? mobileCols.mobile : standardCols.lg;

    const isPlaceholderPresent = items.some(
      (item) => item.type === "Placeholder"
    );
    const currentFilteredItems = isPlaceholderPresent
      ? items.filter((item) => item.type !== "Placeholder")
      : items;

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
      const newItems = [...currentFilteredItems, newItem];
      setItems(newItems);
      saveLayoutToServer(newItems, editTargetDashboard);
      console.log(`Added ${widgetType} at x:${position.x}, y:${position.y}`);
    } else {
      console.warn(`Could not find space for ${widgetType}`);
      showToast({
        title: "Dashboard Full",
        description: `Could not find an available space for the ${widgetType} widget.`,
        variant: "destructive",
      });
    }
  };
  // --- End Add Widget Logic ---

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

  // --- Panel Behavior & Styling (remains the same) ---
  const mainContentPaddingLeft = isToolboxOpen ? "pl-64" : "pl-0";
  const isMobileEditMode = isToolboxOpen && editTargetDashboard === "mobile";

  // --- Render Logic ---
  if (isAuthLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (isLoadingLayout && items.length === 0) {
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
        {/* Render Pomodoro Banner here, above the header */}
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
            <DashboardGrid
              items={items}
              isToolboxOpen={isToolboxOpen}
              isMobileEditMode={isMobileEditMode}
              editTargetDashboard={editTargetDashboard}
              onLayoutChange={onLayoutChange}
              handleResize={handleResize}
              handleDeleteWidget={handleDeleteWidget}
            />
            {isSwitchingEditMode && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-950 bg-opacity-50 z-30">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}
          </main>

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

      <EditModeIndicator
        isToolboxOpen={isToolboxOpen}
        editTargetDashboard={editTargetDashboard}
        toggleEditTarget={toggleEditTarget}
        toggleToolbox={() => toggleToolbox()}
        shakeCount={shakeCount}
      />
    </div>
  );
}
