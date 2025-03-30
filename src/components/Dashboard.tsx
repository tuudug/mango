import React, { useState, useCallback, useRef } from "react"; // Removed useEffect
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
import { Button } from "@/components/ui/button"; // Adjusted path
import { Draggable } from "./Draggable"; // Adjusted path
import { Droppable } from "./Droppable"; // Adjusted path
import { WidgetErrorBoundary } from "./WidgetErrorBoundary"; // Import Error Boundary
// import { SortableWidget } from "./SortableWidget"; // Temporarily removed
import { nanoid } from "nanoid";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import {
  X,
  Sun,
  Moon,
  LucideIcon,
  BarChart3,
  CalendarCheck,
  CheckSquare,
  CalendarDays,
  BedDouble,
  Target,
  BookOpenText,
  HelpCircle, // Import a generic icon for placeholder
  Pencil, // Import Pencil icon
} from "lucide-react"; // Import widget icons
import { useTheme } from "./ThemeProvider"; // Import useTheme hook
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

// Widget imports (adjust paths)
import { TrackableGraphWidget } from "../widgets/TrackableGraphWidget";
import { HabitGraphWidget } from "../widgets/HabitGraphWidget";
import { TodoListWidget } from "../widgets/TodoListWidget";
import { CalendarWidget } from "../widgets/CalendarWidget";
import { SleepStepWidget } from "../widgets/SleepStepWidget";
import { GoalTrackerWidget } from "../widgets/GoalTrackerWidget";
import { JournalWidget } from "../widgets/JournalWidget";
import { PlaceholderWidget } from "../widgets/PlaceholderWidget";

// Widget types
type WidgetType =
  | "Trackable Graph"
  | "Habit Graph"
  | "To-do List"
  | "Calendar"
  | "Sleep/Step"
  | "Goal Tracker"
  | "Journal"
  | "Placeholder";

// Grid item interface
interface GridItem {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// Mode type
type Mode = "view" | "edit";

// Available widgets
const availableWidgets: WidgetType[] = [
  "Trackable Graph",
  "Habit Graph",
  "To-do List",
  "Calendar",
  "Sleep/Step",
  "Goal Tracker",
  "Journal",
  // Placeholder is not available in the toolbox
];

// Default widget layouts
const defaultWidgetLayouts: Record<
  WidgetType,
  { w: number; h: number; minW?: number; minH?: number }
> = {
  "Trackable Graph": { w: 4, h: 3, minW: 3, minH: 2 },
  "Habit Graph": { w: 4, h: 3, minW: 3, minH: 2 },
  "To-do List": { w: 3, h: 4, minW: 2, minH: 3 },
  Calendar: { w: 5, h: 4, minW: 4, minH: 4 },
  "Sleep/Step": { w: 3, h: 3, minW: 2, minH: 2 },
  "Goal Tracker": { w: 4, h: 4, minW: 3, minH: 3 },
  Journal: { w: 5, h: 4, minW: 4, minH: 3 },
  Placeholder: { w: 6, h: 4, minW: 4, minH: 3 },
};

// Widget Metadata: Icon and Accent Color (Left Border)
const widgetMetadata: Record<
  WidgetType,
  { icon: LucideIcon; colorAccentClass: string } // Renamed borderColorClass
> = {
  "Trackable Graph": {
    icon: BarChart3,
    colorAccentClass: "border-l-blue-500 dark:border-l-blue-400", // Changed to border-l-*
  },
  "Habit Graph": {
    icon: CalendarCheck,
    colorAccentClass: "border-l-green-500 dark:border-l-green-400", // Changed to border-l-*
  },
  "To-do List": {
    icon: CheckSquare,
    colorAccentClass: "border-l-yellow-500 dark:border-l-yellow-400", // Changed to border-l-*
  },
  Calendar: {
    icon: CalendarDays,
    colorAccentClass: "border-l-red-500 dark:border-l-red-400", // Changed to border-l-*
  },
  "Sleep/Step": {
    icon: BedDouble,
    colorAccentClass: "border-l-indigo-500 dark:border-l-indigo-400", // Changed to border-l-*
  },
  "Goal Tracker": {
    icon: Target,
    colorAccentClass: "border-l-purple-500 dark:border-l-purple-400", // Changed to border-l-*
  },
  Journal: {
    icon: BookOpenText,
    colorAccentClass: "border-l-pink-500 dark:border-l-pink-400", // Changed to border-l-*
  },
  Placeholder: {
    icon: HelpCircle, // Use a valid Lucide icon type
    colorAccentClass: "border-l-gray-300 dark:border-l-gray-700", // Changed to border-l-*
  }, // Placeholder specific
};

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// Initial placeholder item
const initialPlaceholderId = "placeholder-initial";
const initialItems: GridItem[] = [
  {
    id: initialPlaceholderId,
    type: "Placeholder",
    x: 3, // Center it roughly
    y: 0,
    ...defaultWidgetLayouts["Placeholder"],
  },
];

export function Dashboard() {
  // Changed to export function
  // State
  const [mode, setMode] = useState<Mode>("view");
  const [items, setItems] = useState<GridItem[]>(initialItems); // Initialize with placeholder
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null); // Ref for the grid container
  const { theme, setTheme } = useTheme(); // Get theme state and setter

  // Toggle between view and edit modes
  const toggleMode = () => {
    setMode((prevMode) => (prevMode === "view" ? "edit" : "view"));
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "toolbox-item") {
      setActiveWidget(event.active.id as WidgetType);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveWidget(null);

    if (
      active.data.current?.type === "toolbox-item" &&
      over?.id === "dashboard-grid"
    ) {
      const widgetType = active.id as WidgetType;
      const defaultLayout = defaultWidgetLayouts[widgetType];
      const filteredItems = items.filter((item) => item.type !== "Placeholder");
      let gridX = 0;
      let gridY = Infinity;

      if (
        gridContainerRef.current &&
        event.activatorEvent instanceof PointerEvent
      ) {
        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const relativeX = event.activatorEvent.clientX - gridRect.left;
        const relativeY = event.activatorEvent.clientY - gridRect.top;
        const cols = 12;
        const rowHeight = 50;
        const margin: [number, number] = [15, 15];
        const containerPadding: [number, number] = [20, 20];
        const adjustedX = relativeX - containerPadding[0];
        const adjustedY = relativeY - containerPadding[1];
        const gridWidth = gridRect.width - containerPadding[0] * 2;
        const approxCellWidth = gridWidth / cols;
        const approxCellHeight = rowHeight + margin[1];
        gridX = Math.max(0, Math.floor(adjustedX / approxCellWidth));
        gridY = Math.max(0, Math.floor(adjustedY / approxCellHeight));
      }

      const newItem: GridItem = {
        id: nanoid(),
        type: widgetType,
        x: gridX,
        y: gridY,
        ...defaultLayout,
      };
      setItems([...filteredItems, newItem]);
    }
  };

  // Handle layout changes
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

  // Function to delete a widget
  const handleDeleteWidget = (idToDelete: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== idToDelete));
  };

  // Generate layout for grid
  const generateLayout = (): Layout[] => {
    return items.map((item) => ({
      i: item.id,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: item.minW,
      minH: item.minH,
      isDraggable: mode === "edit",
      isResizable: mode === "edit",
    }));
  };

  // Render widget based on type
  const renderWidget = (item: GridItem) => {
    const widgetContent = (() => {
      switch (item.type) {
        case "Trackable Graph":
          return <TrackableGraphWidget id={item.id} />;
        case "Habit Graph":
          return <HabitGraphWidget id={item.id} />;
        case "To-do List":
          return <TodoListWidget id={item.id} />;
        case "Calendar":
          return <CalendarWidget id={item.id} />;
        case "Sleep/Step":
          return <SleepStepWidget id={item.id} />;
        case "Goal Tracker":
          return <GoalTrackerWidget id={item.id} />;
        case "Journal":
          return <JournalWidget id={item.id} />;
        case "Placeholder":
          return <PlaceholderWidget />;
        default:
          return <div>Unknown Widget: {item.type}</div>;
      }
    })();

    const metadata = widgetMetadata[item.type];
    // Remove duplicate/unused variables:
    // const metadata = widgetMetadata[item.type]; // Removed this duplicate
    const IconComponent = metadata.icon; // Keep this one

    // Wrap the actual widget rendering part with the Error Boundary
    return (
      <WidgetErrorBoundary widgetId={item.id}>
        {/* Main widget container */}
        <div
          className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden w-full h-full border border-gray-200 dark:border-gray-700 border-l-4 ${metadata.colorAccentClass} flex flex-col`} // Use gray border + thick colored left border
        >
          {/* Title Bar */}
          {item.type !== "Placeholder" && ( // No title bar for placeholder
            <div className="flex items-center justify-between p-1.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 cursor-grab">
              {" "}
              {/* Make title bar draggable handle */}
              {/* Left side: Icon + Title */}
              <div className="flex items-center gap-1.5">
                <IconComponent
                  className={`w-3.5 h-3.5 ${metadata.colorAccentClass.replace(
                    // Use colorAccentClass
                    "border-l-", // Replace border-l-
                    "text-"
                  )}`}
                />{" "}
                {/* Use accent color for icon */}
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200 select-none">
                  {item.type}
                </span>
              </div>
              {/* Right side: Controls (Edit Mode Only) */}
              {mode === "edit" && (
                <div className="flex items-center gap-1 widget-controls-cancel-drag">
                  {" "}
                  {/* Add cancel class */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      /* TODO: Add edit logic */ alert(`Edit ${item.type}`);
                    }}
                    className="p-0.5 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                    title="Edit Widget"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteWidget(item.id);
                    }}
                    className="p-0.5 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
                    title="Delete Widget"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Widget Content Area */}
          <div className="flex-1 overflow-hidden p-0">
            {" "}
            {/* Let content take remaining space, remove internal padding if widgets handle it */}
            {widgetContent}
          </div>
        </div>
      </WidgetErrorBoundary>
    );
  };

  // Render widget preview for drag overlay
  const renderWidgetPreview = (type: WidgetType) => {
    const defaultLayout = defaultWidgetLayouts[type];
    const metadata = widgetMetadata[type]; // Get metadata for the icon
    const style = {
      width: `${defaultLayout.w * 100}px`,
      height: `${defaultLayout.h * 50}px`,
      opacity: 0.7,
    };
    return (
      // Add dark mode styles to the preview
      <div
        className="bg-white dark:bg-gray-700 rounded-lg shadow-lg border-2 border-blue-400 dark:border-blue-500 overflow-hidden"
        style={style}
      >
        {/* Add icon to drag overlay */}
        <div className="p-4 flex flex-col items-center justify-center h-full">
          {React.createElement(metadata.icon, {
            className: "w-6 h-6 mb-2 text-gray-600 dark:text-gray-300",
          })}
          <h3 className="font-semibold text-gray-800 dark:text-gray-100 text-center text-sm">
            {type}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Drag to place
          </p>
        </div>
      </div>
    );
  };

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // Handle drag over event
  const handleDragOver = (event: DragOverEvent) => {
    if (event.over && event.over.id === "dashboard-grid") {
      console.log("Dragging over dashboard grid");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      modifiers={[restrictToWindowEdges]}
    >
      {/* ThemeProvider now handles the dark class on <html> */}
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
        {" "}
        {/* Use slightly different dark bg */}
        {/* Header */}
        <header className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center z-10">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Mango Dashboard
          </h1>
          <div className="flex gap-2 items-center">
            {" "}
            {/* Use items-center */}
            {/* Dark Mode Toggle Button */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              className="h-9 w-9" // Adjust size if needed
            >
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
            {/* Edit/View Button */}
            <Button
              onClick={toggleMode}
              variant="outline" // Keep outline variant for contrast
              className="transition-all duration-300"
            >
              {mode === "view" ? "Edit Dashboard" : "View Dashboard"}
            </Button>
          </div>
        </header>
        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden w-full">
          {/* Dashboard Grid */}
          <Droppable id="dashboard-grid">
            <main
              ref={gridContainerRef}
              className={`bg-gray-100 dark:bg-gray-950 h-full w-full overflow-auto transition-all duration-300 ${
                // Darker bg for main grid area
                // Re-added h-full
                mode === "edit" ? "pr-64" : ""
              }`}
              // Removed style={{ width: "100vw" }} - relying on w-full class
            >
              <SortableContext
                items={items.map((item) => item.id)}
                strategy={rectSortingStrategy}
              >
                <ResponsiveGridLayout
                  className="layout" // Removed w-full, rely on WidthProvider
                  layouts={{ lg: generateLayout() }}
                  breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                  cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
                  rowHeight={50}
                  margin={[15, 15]}
                  containerPadding={[20, 20]}
                  isDroppable={false}
                  onLayoutChange={onLayoutChange}
                  style={{ minHeight: "100%" }} // Re-added minHeight to fill vertical space
                  isDraggable={mode === "edit"}
                  isResizable={mode === "edit"}
                  compactType={null}
                  preventCollision={true}
                  draggableCancel=".widget-controls-cancel-drag" // Add cancel selector prop
                  // Removed explicit width prop - let WidthProvider handle it
                >
                  {items.map((item) => (
                    <div
                      key={item.id}
                      data-grid={generateLayout().find((l) => l.i === item.id)}
                    >
                      {renderWidget(item)}
                    </div>
                  ))}
                </ResponsiveGridLayout>
              </SortableContext>
            </main>
          </Droppable>

          {/* Widget Toolbox */}
          {mode === "edit" && (
            <aside className="absolute top-0 right-0 bottom-0 w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-inner overflow-y-auto transition-all duration-300 transform translate-x-0">
              <div className="p-4">
                <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
                  Widget Toolbox
                </h2>
                <div className="space-y-3">
                  {availableWidgets.map((widgetType) => (
                    <Draggable
                      key={widgetType}
                      id={widgetType}
                      data={{ type: "toolbox-item", widgetType }}
                    >
                      {/* Add icon and color to toolbox item */}
                      <div
                        className={`flex items-center gap-2 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700 cursor-grab hover:bg-gray-100 dark:hover:bg-gray-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 shadow-sm`} // Reverted to gray border, added hover effect
                      >
                        {React.createElement(widgetMetadata[widgetType].icon, {
                          className: `w-4 h-4 ${widgetMetadata[ // Use colorAccentClass
                            widgetType
                          ].colorAccentClass
                            .replace("border-l-", "text-")}`, // Use accent color for icon
                        })}
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
                          {" "}
                          {/* Ensure text is visible */}
                          {widgetType}
                        </span>
                      </div>
                    </Draggable>
                  ))}
                </div>
              </div>
            </aside>
          )}
        </div>
        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? renderWidgetPreview(activeWidget) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
