import React from "react";
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import { GridItem } from "@/lib/dashboardConfig";
import { DashboardGridItem } from "@/components/DashboardGridItem";
import { cn } from "@/lib/utils";
import { standardBreakpoints, standardCols, mobileCols } from "../constants";
import { DashboardName } from "../types";
// Removed: import { motion, AnimatePresence } from "framer-motion"; // Revert import

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define mobile breakpoint specifically for the edit preview
const mobileEditBreakpoints = { mobile: 375 }; // Match container width

interface DashboardGridProps {
  items: GridItem[];
  isToolboxOpen: boolean;
  isMobileEditMode: boolean;
  editTargetDashboard: DashboardName;
  onLayoutChange: (layout: Layout[]) => void;
  handleResize: (
    layout: Layout[],
    oldItem: Layout,
    newItemLayout: Layout
  ) => void;
  handleDeleteWidget: (idToDelete: string) => void;
}

export const DashboardGrid: React.FC<DashboardGridProps> = ({
  items,
  isToolboxOpen,
  isMobileEditMode,
  // editTargetDashboard, // No longer directly needed here
  onLayoutChange,
  handleResize,
  handleDeleteWidget,
}) => {
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
      isDraggable: isToolboxOpen,
      isResizable: isToolboxOpen,
    }));
  };

  // Common props applicable to both grid instances
  const commonGridProps = {
    className: "layout",
    rowHeight: 30,
    margin: [10, 10] as [number, number],
    containerPadding: [15, 15] as [number, number],
    onLayoutChange: onLayoutChange,
    onResizeStop: handleResize,
    style: { minHeight: "100%" },
    isDraggable: isToolboxOpen,
    isResizable: isToolboxOpen,
    compactType: null,
    preventCollision: true,
    draggableCancel: ".widget-controls-cancel-drag",
  };

  // Removed animation props

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
          {/* Removed AnimatePresence wrapper */}
          {items.map((item) => (
            // Removed motion.div wrapper
            <div key={item.id}>
              <DashboardGridItem
                item={item}
                isEditing={isToolboxOpen}
                handleDeleteWidget={handleDeleteWidget}
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
        {/* Removed AnimatePresence wrapper */}
        {items.map((item) => (
          // Removed motion.div wrapper
          <div key={item.id}>
            <DashboardGridItem
              item={item}
              isEditing={isToolboxOpen}
              handleDeleteWidget={handleDeleteWidget}
            />
          </div>
        ))}
      </ResponsiveGridLayout>
    );
  }
};
