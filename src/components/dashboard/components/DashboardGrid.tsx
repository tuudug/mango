import React from "react";
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { GridItem } from "@/lib/dashboardConfig";
import { DashboardGridItem } from "@/components/DashboardGridItem";
import { cn } from "@/lib/utils";
import {
  standardBreakpoints,
  standardCols,
  // mobileBreakpoints, // Will define slightly differently below
  mobileCols,
} from "../constants";
import { DashboardName } from "../types";

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Define mobile breakpoint specifically for the edit preview
const mobileEditBreakpoints = { mobile: 375 }; // Match container width

interface DashboardGridProps {
  items: GridItem[];
  isToolboxOpen: boolean;
  isMobileEditMode: boolean;
  editTargetDashboard: DashboardName; // Keep for potential future use, though not directly used in grid logic now
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
  // This function is used by both grid instances
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
    isDroppable: isToolboxOpen,
    onLayoutChange: onLayoutChange,
    onResizeStop: handleResize,
    style: { minHeight: "100%" },
    isDraggable: isToolboxOpen,
    isResizable: isToolboxOpen,
    compactType: null,
    preventCollision: true,
    draggableCancel: ".widget-controls-cancel-drag",
  };

  // Render the appropriate grid based on edit mode
  if (isMobileEditMode) {
    // Mobile Edit Grid - Render inside the styled wrapper
    const mobileEditWrapperClasses =
      "w-[375px] max-w-[375px] border-2 border-dashed border-blue-500 dark:border-blue-400 mx-auto h-full"; // Ensure h-full

    return (
      <div className={cn(mobileEditWrapperClasses)}>
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <ResponsiveGridLayout
            {...commonGridProps}
            key="mobile-grid-instance" // Explicit key for the instance
            // Use mobile-specific breakpoints and cols
            breakpoints={mobileEditBreakpoints}
            cols={mobileCols}
            // layouts prop needs to match the breakpoint name ('mobile')
            layouts={{ mobile: generateLayout() }}
            // WidthProvider should get width from the parent div
          >
            {items.map((item) => (
              <div key={item.id}>
                <DashboardGridItem
                  item={item}
                  isEditing={isToolboxOpen}
                  handleDeleteWidget={handleDeleteWidget}
                />
              </div>
            ))}
          </ResponsiveGridLayout>
        </SortableContext>
      </div>
    );
  } else {
    // Standard Desktop/Responsive Grid - Render directly
    return (
      <SortableContext
        items={items.map((item) => item.id)}
        strategy={rectSortingStrategy}
      >
        <ResponsiveGridLayout
          {...commonGridProps}
          key="standard-grid-instance" // Explicit key for the instance
          // Use standard breakpoints and cols
          breakpoints={standardBreakpoints}
          cols={standardCols}
          // RGL uses 'lg' layout if breakpoint matches, or finds closest match
          // Providing the layout under 'lg' is usually sufficient for standard view
          layouts={{ lg: generateLayout() }}
        >
          {items.map((item) => (
            <div key={item.id}>
              <DashboardGridItem
                item={item}
                isEditing={isToolboxOpen}
                handleDeleteWidget={handleDeleteWidget}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      </SortableContext>
    );
  }
};
