import React from "react";
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import { GridItem } from "@/lib/dashboardConfig";
import { DashboardGridItem } from "@/components/DashboardGridItem";
import { cn } from "@/lib/utils";
import { standardBreakpoints, standardCols, mobileCols } from "../constants";
import { DashboardName } from "../types";

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define mobile breakpoint specifically for the edit preview
const mobileEditBreakpoints = { mobile: 375 }; // Match container width

// --- Update Props Interface ---
interface DashboardGridProps {
  items: GridItem[]; // Already accepts items
  isToolboxOpen: boolean;
  isMobileEditMode: boolean;
  editTargetDashboard: DashboardName; // Add prop here
  onLayoutChange: (layout: Layout[]) => void;
  onLiveResize: (
    layout: Layout[],
    oldItem: Layout,
    newItemLayout: Layout
  ) => void;
  handleResizeStop: (
    layout: Layout[],
    oldItem: Layout,
    newItemLayout: Layout
  ) => void;
  handleDeleteWidget: (idToDelete: string) => void;
  isConfigModalActive: boolean; // Add prop for modal state
  onConfigModalToggle: (isOpen: boolean) => void; // Add callback prop
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  items,
  isToolboxOpen,
  isMobileEditMode,
  editTargetDashboard, // Destructure the prop
  onLayoutChange,
  onLiveResize, // Destructure the new prop
  handleResizeStop, // Use the renamed prop
  handleDeleteWidget,
  isConfigModalActive, // Destructure new prop
  onConfigModalToggle, // Destructure new prop
}) => {
  // --- Determine if grid interaction should be enabled ---
  const enableGridInteraction = isToolboxOpen && !isConfigModalActive;

  // Generate layout for grid (used by RGL)
  const generateLayout = (): Layout[] => {
    return items.map((item) => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      // Use the combined state to control dragging/resizing
      isDraggable: enableGridInteraction,
      isResizable: enableGridInteraction,
    }));
  };

  // Common props applicable to both grid instances
  const commonGridProps = {
    className: "layout",
    rowHeight: 30,
    margin: [10, 10] as [number, number],
    containerPadding: [15, 15] as [number, number],
    onLayoutChange: onLayoutChange,
    onResize: onLiveResize, // Connect the live resize handler
    onResizeStop: handleResizeStop, // Connect the stop handler
    style: { minHeight: "100%" },
    // Use the combined state to control dragging/resizing
    isDraggable: enableGridInteraction,
    isResizable: enableGridInteraction,
    compactType: null,
    preventCollision: true,
    draggableCancel: ".widget-controls-cancel-drag",
  };

  // Render the appropriate grid based on edit mode
  if (isMobileEditMode) {
    // Mobile Edit Grid
    const mobileEditWrapperClasses =
      "w-[375px] max-w-[375px] border-2 border-dashed border-blue-400 mx-auto h-full";

    return (
      <div className={cn(mobileEditWrapperClasses)}>
        <ResponsiveGridLayout
          {...commonGridProps}
          key="mobile-grid-instance"
          breakpoints={mobileEditBreakpoints}
          cols={mobileCols}
          layouts={{ mobile: generateLayout() }} // RGL needs layouts prop
        >
          {items.map((item) => (
            <div key={item.id}>
              <DashboardGridItem
                item={item}
                items={items} // Pass the full items array down
                isEditing={isToolboxOpen} // Still pass isToolboxOpen for general edit state
                handleDeleteWidget={handleDeleteWidget}
                editTargetDashboard={editTargetDashboard} // Pass prop down
                onConfigModalToggle={onConfigModalToggle} // Pass callback down
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    );
  } else {
    // Standard Desktop/Responsive Grid
    return (
      <ResponsiveGridLayout
        {...commonGridProps}
        key="standard-grid-instance"
        breakpoints={standardBreakpoints}
        cols={standardCols}
        layouts={{ lg: generateLayout() }} // RGL needs layouts prop
      >
        {items.map((item) => (
          <div key={item.id}>
            <DashboardGridItem
              item={item}
              items={items} // Pass the full items array down
              isEditing={isToolboxOpen} // Still pass isToolboxOpen for general edit state
              handleDeleteWidget={handleDeleteWidget}
              editTargetDashboard={editTargetDashboard} // Pass prop down
              onConfigModalToggle={onConfigModalToggle} // Pass callback down
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    );
  }
};
