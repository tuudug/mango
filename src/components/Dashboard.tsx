import React, { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { Droppable } from "./Droppable";
import { nanoid } from "nanoid";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import {
  GridItem,
  Mode,
  WidgetType,
  defaultWidgetLayouts,
} from "@/lib/dashboardConfig"; // Import config
import { DashboardHeader } from "./DashboardHeader"; // Import Header
import { WidgetToolbox } from "./WidgetToolbox"; // Import Toolbox
import { WidgetPreview } from "./WidgetPreview"; // Import Preview
import { DashboardGridItem } from "./DashboardGridItem"; // Import Grid Item
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// --- LocalStorage Persistence ---
const LOCAL_STORAGE_KEY = "dashboardLayout";

// Function to load layout from localStorage
const loadLayoutFromLocalStorage = (): GridItem[] => {
  try {
    const savedLayout = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLayout) {
      const parsedLayout: Omit<GridItem, "minW" | "minH">[] =
        JSON.parse(savedLayout);
      // Basic validation and merge with defaults
      if (Array.isArray(parsedLayout)) {
        // Map saved layout and merge minW/minH from defaults
        return parsedLayout.map((item) => {
          const defaults = defaultWidgetLayouts[item.type] || {
            minW: 1,
            minH: 1,
          }; // Fallback defaults
          return {
            ...item,
            minW: defaults.minW,
            minH: defaults.minH,
          };
        });
      }
    }
  } catch (error) {
    console.error("Error loading dashboard layout from localStorage:", error);
  }
  // Return default if nothing saved or error occurred
  return [
    // Default includes only the placeholder
    {
      id: nanoid(), // Give placeholder a unique ID on default load
      type: "Placeholder",
      x: 3,
      y: 0,
      ...defaultWidgetLayouts["Placeholder"],
    },
  ];
};

// Function to save layout to localStorage (excluding minW/minH)
const saveLayoutToLocalStorage = (items: GridItem[]) => {
  try {
    // Map items to explicitly pick properties to save, excluding minW/minH
    const itemsToSave = items.map((item) => ({
      id: item.id,
      type: item.type,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      // minW and minH are omitted
    }));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(itemsToSave));
  } catch (error) {
    console.error("Error saving dashboard layout to localStorage:", error);
  }
};
// --- End LocalStorage ---

// Old initialItems definition is removed as loading handles the default state now.

export function Dashboard() {
  // State
  const [mode, setMode] = useState<Mode>("view");
  // Load initial items from localStorage or use default
  const [items, setItems] = useState<GridItem[]>(loadLayoutFromLocalStorage);
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Toggle between view and edit modes & SAVE on switching from edit to view
  const toggleMode = () => {
    setMode((prevMode) => {
      const nextMode = prevMode === "view" ? "edit" : "view";
      // If switching FROM edit TO view, save the layout
      if (prevMode === "edit" && nextMode === "view") {
        saveLayoutToLocalStorage(items);
      }
      return nextMode;
    });
  };

  // Handle drag start from toolbox
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "toolbox-item") {
      // Check if data exists
      setActiveWidget(event.active.id as WidgetType);
    }
  };

  // Handle drag end (dropping item from toolbox onto grid)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWidget(null); // Clear active widget regardless

    // Check if item is from toolbox and dropped onto the dashboard grid
    if (
      active.data.current?.type === "toolbox-item" &&
      over?.id === "dashboard-grid"
    ) {
      const widgetType = active.id as WidgetType; // Get type from draggable ID
      const defaultLayout = defaultWidgetLayouts[widgetType];

      // Remove placeholder if it exists and we are adding a new widget
      const isPlaceholderPresent = items.some(
        (item) => item.type === "Placeholder"
      );
      const filteredItems = isPlaceholderPresent
        ? items.filter((item) => item.type !== "Placeholder")
        : items;

      // Calculate drop position (simplified, needs refinement for accuracy)
      // This calculation is basic and might not perfectly align with grid cells
      // A more robust solution would involve react-grid-layout's internal logic if possible,
      // or more precise calculations based on grid dimensions and mouse position.
      let gridX = 0;
      let gridY = Infinity; // Default to placing at the bottom

      if (
        gridContainerRef.current &&
        event.activatorEvent instanceof PointerEvent // Check if activatorEvent is a PointerEvent
      ) {
        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const relativeX = event.activatorEvent.clientX - gridRect.left;
        const relativeY = event.activatorEvent.clientY - gridRect.top;

        // These values MUST match react-grid-layout's configuration in the JSX below
        const cols = 24; // Updated column count
        const rowHeight = 30; // Updated row height
        const margin: [number, number] = [10, 10]; // Updated margin
        const containerPadding: [number, number] = [15, 15]; // Updated padding

        // Adjust coordinates for padding
        const adjustedX = relativeX - containerPadding[0];
        const adjustedY = relativeY - containerPadding[1];

        // Estimate grid cell dimensions (this is approximate)
        const gridWidth = gridRect.width - containerPadding[0] * 2;
        const approxCellWidth = gridWidth / cols; // Includes margin
        const approxCellHeight = rowHeight + margin[1]; // Includes margin

        // Calculate grid coordinates (clamp to grid bounds)
        // Ensure widget doesn't go off the right edge
        gridX = Math.max(
          0,
          Math.min(
            cols - defaultLayout.w, // Ensure widget fits within the column count
            Math.floor(adjustedX / approxCellWidth)
          )
        );
        gridY = Math.max(0, Math.floor(adjustedY / approxCellHeight));
      }

      // Create the new widget item
      const newItem: GridItem = {
        id: nanoid(), // Generate unique ID
        type: widgetType,
        x: gridX,
        y: gridY, // Place it based on calculated Y or at the bottom
        ...defaultLayout, // Spread default width/height (already updated in config)
      };

      // Add the new item to the state
      setItems([...filteredItems, newItem]);
    }
    // Note: Dragging existing items within the grid is handled by react-grid-layout's onLayoutChange
  };

  // Handle layout changes from react-grid-layout (moving/resizing existing items)
  const onLayoutChange = useCallback((layout: Layout[]) => {
    setItems((prevItems) =>
      prevItems.map((item) => {
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
      })
    );
  }, []);

  // Handle resize events from react-grid-layout (fires continuously during resize)
  const handleResize = useCallback(
    (layout: Layout[], oldItem: Layout, newItem: Layout) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id === newItem.i) {
            // Update width and height for the item being resized
            return {
              ...item,
              w: newItem.w,
              h: newItem.h,
            };
          }
          return item;
        })
      );
    },
    []
  );

  // Function to delete a widget
  const handleDeleteWidget = (idToDelete: string) => {
    setItems((prevItems) => {
      const newItems = prevItems.filter((item) => item.id !== idToDelete);
      // If deleting the last item, add back the placeholder
      if (newItems.length === 0) {
        return [
          {
            id: nanoid(), // Give placeholder a unique ID
            type: "Placeholder",
            x: 3,
            y: 0,
            ...defaultWidgetLayouts["Placeholder"],
          },
        ];
      }
      return newItems;
    });
  };

  // Generate layout for grid
  const generateLayout = (): Layout[] => {
    // No need to map/recenter placeholder here anymore, initial load handles it
    return items.map((item) => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w, // Use width from state (updated via config)
      h: item.h, // Use height from state (updated via config)
      minW: item.minW, // Use minW from state (updated via config)
      minH: item.minH, // Use minH from state (updated via config)
      isDraggable: mode === "edit",
      isResizable: mode === "edit",
    }));
  };

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the mouse to move beyond 5 pixels to start dragging
      activationConstraint: { distance: 5 },
    })
  );

  // Handle drag over event
  const handleDragOver = (event: DragOverEvent) => {
    if (event.over && event.over.id === "dashboard-grid") {
      console.log("Dragging over dashboard grid"); // Keep for debugging if needed
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver} // Handle dragging over the grid
      modifiers={[restrictToWindowEdges]} // Keep dragged items within window
    >
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {/* Use DashboardHeader component */}
        <DashboardHeader mode={mode} toggleMode={toggleMode} />
        <div className="flex-1 relative overflow-hidden w-full">
          {/* Dashboard Grid Area */}
          <Droppable id="dashboard-grid">
            {" "}
            {/* Make the grid droppable */}
            <main
              ref={gridContainerRef} // Ref for position calculations
              className={`bg-gray-100 dark:bg-gray-950 h-full w-full overflow-auto transition-all duration-300 ease-in-out ${
                mode === "edit" ? "pl-64" : "pl-0" // Adjust LEFT padding when toolbox is open
              }`}
            >
              {/* SortableContext for dnd-kit integration (optional if only using RGL drag) */}
              <SortableContext
                items={items.map((item) => item.id)} // Provide IDs for sortable items
                strategy={rectSortingStrategy} // Use grid sorting strategy
              >
                <ResponsiveGridLayout
                  className="layout"
                  layouts={{ lg: generateLayout() }} // Generate layout based on items state
                  // Define breakpoints for responsive behavior
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  // Double the columns for finer granularity
                  cols={{ lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 }}
                  // Adjust row height for vertical granularity
                  rowHeight={30}
                  // Keep margin and padding, adjust if needed visually
                  margin={[10, 10]} // Slightly reduce margin
                  containerPadding={[15, 15]} // Slightly reduce padding
                  isDroppable={false} // Let dnd-kit handle dropping from toolbox
                  onLayoutChange={onLayoutChange} // Update state when RGL changes layout (end of drag/resize)
                  onResize={handleResize} // Update state continuously during resize
                  style={{ minHeight: "100%" }} // Ensure grid fills space
                  isDraggable={mode === "edit"} // Enable/disable dragging based on mode
                  isResizable={mode === "edit"} // Enable/disable resizing based on mode
                  compactType={null} // Allow free placement
                  preventCollision={true} // Prevent widgets from overlapping
                  draggableCancel=".widget-controls-cancel-drag" // Prevent dragging via controls
                >
                  {/* Map through items and render DashboardGridItem for each */}
                  {items.map((item) => (
                    <div
                      key={item.id}
                      data-grid={generateLayout().find((l) => l.i === item.id)} // Pass grid data to RGL
                    >
                      <DashboardGridItem
                        item={item}
                        mode={mode}
                        handleDeleteWidget={handleDeleteWidget}
                      />
                    </div>
                  ))}
                </ResponsiveGridLayout>
              </SortableContext>
            </main>
          </Droppable>

          {/* Render WidgetToolbox with conditional transform for sliding */}
          <div
            className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out ${
              mode === "edit" ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            <WidgetToolbox />
          </div>
        </div>

        {/* Drag Overlay for visual feedback during drag */}
        <DragOverlay>
          {/* Render WidgetPreview if a widget is being dragged from the toolbox */}
          {activeWidget ? <WidgetPreview type={activeWidget} /> : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
