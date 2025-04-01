import {
  GridItem,
  WidgetType,
  defaultWidgetLayouts,
} from "@/lib/dashboardConfig"; // Import config
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
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { nanoid } from "nanoid";
import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // Added useMemo
import { Layout, Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { DashboardGridItem } from "./DashboardGridItem"; // Import Grid Item
import { DashboardHeader } from "./DashboardHeader"; // Import Header
import { Droppable } from "./Droppable";
import { GameMasterPanel } from "./GameMasterPanel"; // Import GM Panel
import { LeftSidebar } from "./LeftSidebar"; // Import Left Sidebar
import { PathsPage } from "./PathsPage"; // Import Paths Page
import { UserProfilePanel } from "./UserProfilePanel"; // Import User Profile Panel
import { WidgetPreview } from "./WidgetPreview"; // Import Preview
import { WidgetToolbox } from "./WidgetToolbox"; // Import Toolbox
// Import Data Source components
import { CalendarDataSource } from "./datasources/CalendarDataSource";
import { HealthDataSource } from "./datasources/HealthDataSource";
import { TodosDataSource } from "./datasources/TodosDataSource";
import { Button } from "./ui/button"; // Import Button
import { X } from "lucide-react"; // Import X icon

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// --- LocalStorage Persistence ---
const LAYOUT_STORAGE_KEY = "dashboardLayout";
const PATH_STATE_STORAGE_KEY = "dashboardPathState";

interface SavedPathState {
  activePathName: string | null;
  unlockedItems: Record<string, boolean>;
  currentPathProgressXP: number;
}

// Function to load layout from localStorage
const loadLayoutFromLocalStorage = (): GridItem[] => {
  try {
    const savedLayout = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (savedLayout) {
      const parsedLayout: Omit<GridItem, "minW" | "minH">[] =
        JSON.parse(savedLayout);
      if (Array.isArray(parsedLayout)) {
        return parsedLayout.map((item) => {
          const defaults =
            item.type && defaultWidgetLayouts[item.type]
              ? defaultWidgetLayouts[item.type]
              : { w: 6, h: 4, minW: 2, minH: 2 };
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
  return [
    {
      id: nanoid(),
      type: "Placeholder",
      x: 3,
      y: 0,
      ...(defaultWidgetLayouts["Placeholder"] || {
        w: 12,
        h: 7,
        minW: 8,
        minH: 5,
      }),
    },
  ];
};

// Function to save layout to localStorage
const saveLayoutToLocalStorage = (items: GridItem[]) => {
  try {
    const itemsToSave = items.map(({ ...rest }) => rest);
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(itemsToSave));
  } catch (error) {
    console.error("Error saving dashboard layout to localStorage:", error);
  }
};

// Function to load path state from localStorage
const loadPathStateFromLocalStorage = (): SavedPathState => {
  try {
    const savedState = localStorage.getItem(PATH_STATE_STORAGE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      // Add basic validation if needed
      return parsedState;
    }
  } catch (error) {
    console.error("Error loading path state from localStorage:", error);
  }
  // Return default path state
  return {
    activePathName: null, // Start with no active path
    unlockedItems: {
      // Default unlocked items (cost 0)
      "To-Do List": true,
      "Steps Tracker": true,
      Journal: true,
    },
    currentPathProgressXP: 0,
  };
};

// Function to save path state to localStorage
const savePathStateToLocalStorage = (state: SavedPathState) => {
  try {
    localStorage.setItem(PATH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving path state to localStorage:", error);
  }
};
// --- End LocalStorage ---

// Placeholder: Define paths data structure here or import it
// This should match the structure used in PathsPage.tsx for calculating next unlock
const pathsData = [
  /* Assuming pathsData is defined similarly to PathsPage */
  {
    name: "Productivity",
    items: [
      { label: "To-Do List", xpCost: 0 },
      { label: "Calendars", xpCost: 100 } /* ... */,
    ],
  },
  {
    name: "Health & Wellness",
    items: [
      { label: "Steps Tracker", xpCost: 0 },
      { label: "Habit Graph", xpCost: 150 } /* ... */,
    ],
  },
  {
    name: "Mindfulness/Focus",
    items: [
      { label: "Journal", xpCost: 0 },
      { label: "Ambience", xpCost: 100 } /* ... */,
    ],
  },
  {
    name: "Game Master",
    items: [
      { label: "GM Tones", xpCost: 300 },
      { label: "GM Limit Up", xpCost: 750 } /* ... */,
    ],
  },
  {
    name: "Gamification",
    items: [
      { label: "Puzzles", xpCost: 200 },
      { label: "Achievements", xpCost: 500 } /* ... */,
    ],
  },
];

export function Dashboard() {
  // State
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isGameMasterPanelOpen, setIsGameMasterPanelOpen] = useState(false);
  const [isUserProfilePanelOpen, setIsUserProfilePanelOpen] = useState(false);
  const [isPathsPageOpen, setIsPathsPageOpen] = useState(false);
  // Add state for data source panels
  const [isCalendarDataSourceOpen, setIsCalendarDataSourceOpen] =
    useState(false);
  const [isHealthDataSourceOpen, setIsHealthDataSourceOpen] = useState(false);
  const [isTodosDataSourceOpen, setIsTodosDataSourceOpen] = useState(false);
  const [items, setItems] = useState<GridItem[]>(loadLayoutFromLocalStorage);
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Path State
  const [pathState, setPathState] = useState<SavedPathState>(
    loadPathStateFromLocalStorage
  );
  const { activePathName, unlockedItems, currentPathProgressXP } = pathState;

  // Calculate next unlock XP based on active path and unlocked items
  const nextUnlockXP = useMemo(() => {
    if (!activePathName) return 0;
    const activePath = pathsData.find((p) => p.name === activePathName);
    if (!activePath) return 0;

    const nextItem = activePath.items.find(
      (item) => !unlockedItems[item.label]
    );
    return nextItem ? nextItem.xpCost : 0; // Return 0 if path is complete
  }, [activePathName, unlockedItems]);

  // Effect to save path state whenever it changes
  useEffect(() => {
    savePathStateToLocalStorage(pathState);
  }, [pathState]);

  // Toggle Toolbox (Edit Mode) & SAVE layout on close
  const toggleToolbox = () => {
    setIsToolboxOpen((prev) => {
      const nextIsOpen = !prev;
      if (!nextIsOpen) {
        saveLayoutToLocalStorage(items);
      }
      if (nextIsOpen) {
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        // Close data source panels when toolbox opens
        setIsCalendarDataSourceOpen(false);
        setIsHealthDataSourceOpen(false);
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle Game Master Panel
  const toggleGameMasterPanel = () => {
    setIsGameMasterPanelOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        // Close data source panels when GM panel opens
        setIsCalendarDataSourceOpen(false);
        setIsHealthDataSourceOpen(false);
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle User Profile Panel
  const toggleUserProfilePanel = () => {
    setIsUserProfilePanelOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsGameMasterPanelOpen(false);
        setIsPathsPageOpen(false);
        // Close data source panels when profile opens
        setIsCalendarDataSourceOpen(false);
        setIsHealthDataSourceOpen(false);
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle Paths Page
  const togglePathsPage = () => {
    setIsPathsPageOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        // Close data source panels when paths page opens
        setIsCalendarDataSourceOpen(false);
        setIsHealthDataSourceOpen(false);
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle Calendar Data Source Panel
  const toggleCalendarDataSource = () => {
    setIsCalendarDataSourceOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        setIsHealthDataSourceOpen(false); // Close other data sources
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle Health Data Source Panel
  const toggleHealthDataSource = () => {
    setIsHealthDataSourceOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        setIsCalendarDataSourceOpen(false); // Close other data sources
        setIsTodosDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Toggle Todos Data Source Panel
  const toggleTodosDataSource = () => {
    setIsTodosDataSourceOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        setIsCalendarDataSourceOpen(false); // Close other data sources
        setIsHealthDataSourceOpen(false);
      }
      return nextIsOpen;
    });
  };

  // Set Active Path (Resets progress)
  const setActivePath = (pathName: string) => {
    setPathState((prev) => ({
      ...prev,
      activePathName: pathName,
      currentPathProgressXP: 0, // Reset progress on switch
    }));
    // Optionally close the panel after selection
    // setIsPathsPageOpen(false);
  };

  // Handle drag start from toolbox
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "toolbox-item") {
      setActiveWidget(event.active.id as WidgetType);
    }
  };

  // Handle drag end (dropping item from toolbox onto grid)
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

      if (
        gridContainerRef.current &&
        event.activatorEvent instanceof PointerEvent
      ) {
        const gridRect = gridContainerRef.current.getBoundingClientRect();
        const sidebarWidth = 64; // w-16
        const relativeX =
          event.activatorEvent.clientX - gridRect.left - sidebarWidth;
        const relativeY = event.activatorEvent.clientY - gridRect.top;

        const cols = 24;
        const rowHeight = 30;
        const margin: [number, number] = [10, 10];
        const containerPadding: [number, number] = [15, 15];

        // Adjust for panel width if open (assuming all panels slide from left)
        // Adjust panelWidth calculation to include data source panels
        const panelWidth = isToolboxOpen
          ? 256 // w-64
          : isGameMasterPanelOpen || isUserProfilePanelOpen
          ? 288 // w-72
          : isPathsPageOpen ||
            isCalendarDataSourceOpen ||
            isHealthDataSourceOpen ||
            isTodosDataSourceOpen
          ? 320 // w-80 (assuming same width for paths and data sources)
          : 0;
        const adjustedX = relativeX - containerPadding[0] - panelWidth;
        const adjustedY = relativeY - containerPadding[1];

        const gridWidth =
          gridRect.width - sidebarWidth - containerPadding[0] * 2 - panelWidth;
        const approxCellWidth = gridWidth / cols;
        const approxCellHeight = rowHeight + margin[1];

        gridX = Math.max(
          0,
          Math.min(
            cols - (defaultLayout?.w || 6), // Use default width or fallback
            Math.floor(adjustedX / approxCellWidth)
          )
        );
        gridY = Math.max(0, Math.floor(adjustedY / approxCellHeight));
      }

      const newItem: GridItem = {
        id: nanoid(),
        type: widgetType,
        x: gridX,
        y: gridY,
        ...(defaultLayout || { w: 6, h: 4, minW: 2, minH: 2 }), // Use default layout or fallback
      };
      setItems([...filteredItems, newItem]);
    }
  };

  // Handle layout changes from react-grid-layout
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

  // Handle resize events from react-grid-layout
  const handleResize = useCallback(
    (_layout: Layout[], _oldItem: Layout, newItem: Layout) => {
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (item.id === newItem.i) {
            return { ...item, w: newItem.w, h: newItem.h };
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
      if (newItems.length === 0) {
        return [
          {
            id: nanoid(),
            type: "Placeholder",
            x: 3,
            y: 0,
            ...(defaultWidgetLayouts["Placeholder"] || {
              w: 12,
              h: 7,
              minW: 8,
              minH: 5,
            }), // Fallback
          },
        ];
      }
      return newItems;
    });
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
      isDraggable: isToolboxOpen, // Drag/Resize only when toolbox is open
      isResizable: isToolboxOpen,
    }));
  };

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // Calculate left padding for main content based on open panels
  const mainContentPaddingLeft = isToolboxOpen
    ? "pl-64" // Toolbox width w-64
    : isGameMasterPanelOpen
    ? "pl-72" // GM Panel width w-72
    : isUserProfilePanelOpen
    ? "pl-72" // Profile Panel width w-72
    : isPathsPageOpen
    ? "pl-96" // Paths page width w-96
    : isCalendarDataSourceOpen ||
      isHealthDataSourceOpen ||
      isTodosDataSourceOpen
    ? "pl-80" // Data Source Panel width w-80 (320px)
    : "pl-0";

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      {/* Main container with fixed sidebar width offset */}
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pl-16">
        {" "}
        {/* pl-16 for fixed sidebar */}
        <LeftSidebar
          isToolboxOpen={isToolboxOpen}
          isGameMasterPanelOpen={isGameMasterPanelOpen}
          isUserProfilePanelOpen={isUserProfilePanelOpen}
          isPathsPageOpen={isPathsPageOpen}
          // Pass data source states and toggles
          isCalendarDataSourceOpen={isCalendarDataSourceOpen}
          isHealthDataSourceOpen={isHealthDataSourceOpen}
          isTodosDataSourceOpen={isTodosDataSourceOpen}
          toggleToolbox={toggleToolbox}
          toggleGameMasterPanel={toggleGameMasterPanel}
          onProfileClick={toggleUserProfilePanel}
          togglePathsPage={togglePathsPage}
          toggleCalendarDataSource={toggleCalendarDataSource}
          toggleHealthDataSource={toggleHealthDataSource}
          toggleTodosDataSource={toggleTodosDataSource}
        />
        <div className="flex flex-col flex-1 overflow-hidden">
          {" "}
          {/* Container for header + main content */}
          <DashboardHeader /> {/* No props needed */}
          <div className="flex-1 relative overflow-hidden w-full">
            {" "}
            {/* Container for grid + sliding panels */}
            {/* Dashboard Grid Area */}
            <Droppable id="dashboard-grid">
              <main
                ref={gridContainerRef}
                // Dynamic padding based on which panel is open
                // Added absolute inset-0 to ensure it fills the parent relative container
                className={`absolute inset-0 bg-gray-100 dark:bg-gray-950 overflow-auto transition-all duration-300 ease-in-out ${mainContentPaddingLeft}`}
              >
                <SortableContext
                  items={items.map((item) => item.id)}
                  strategy={rectSortingStrategy}
                >
                  <ResponsiveGridLayout
                    className="layout"
                    layouts={{ lg: generateLayout() }}
                    breakpoints={{
                      lg: 1200,
                      md: 996,
                      sm: 768,
                      xs: 480,
                      xxs: 0,
                    }}
                    cols={{ lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 }}
                    rowHeight={30}
                    margin={[10, 10]}
                    containerPadding={[15, 15]}
                    isDroppable={false} // dnd-kit handles dropping
                    onLayoutChange={onLayoutChange}
                    onResize={handleResize}
                    style={{ minHeight: "100%" }}
                    isDraggable={isToolboxOpen}
                    isResizable={isToolboxOpen}
                    compactType={null}
                    preventCollision={true}
                    draggableCancel=".widget-controls-cancel-drag"
                  >
                    {items.map((item) => (
                      <div
                        key={item.id}
                        data-grid={generateLayout().find(
                          (l) => l.i === item.id
                        )}
                      >
                        {/* Pass handleDeleteWidget and isEditing state */}
                        <DashboardGridItem
                          item={item}
                          isEditing={isToolboxOpen} // Pass toolbox state as editing flag
                          handleDeleteWidget={handleDeleteWidget}
                        />
                      </div>
                    ))}
                  </ResponsiveGridLayout>
                </SortableContext>
              </main>
            </Droppable>
            {/* Sliding Panels Container (relative to the inner flex container) */}
            {/* Render WidgetToolbox with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isToolboxOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Pass toggleToolbox as onClose prop */}
              <WidgetToolbox onClose={toggleToolbox} />
            </div>
            {/* Render GameMasterPanel with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isGameMasterPanelOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <GameMasterPanel onClose={toggleGameMasterPanel} />
            </div>
            {/* Render UserProfilePanel with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isUserProfilePanelOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <UserProfilePanel onClose={toggleUserProfilePanel} />
            </div>
            {/* Render PathsPage with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isPathsPageOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Pass path state and handler */}
              <PathsPage
                onClose={togglePathsPage}
                activePathName={activePathName}
                setActivePath={setActivePath}
                unlockedItems={unlockedItems}
                currentPathProgressXP={currentPathProgressXP}
                nextUnlockXP={nextUnlockXP}
              />
            </div>
            {/* Render CalendarDataSource with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
                // Added w-80
                isCalendarDataSourceOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <CalendarDataSource />
            </div>
            {/* Render HealthDataSource with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
                // Added w-80
                isHealthDataSourceOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <HealthDataSource />
            </div>
            {/* Render TodosDataSource with conditional transform */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
                // Added w-80
                isTodosDataSourceOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <TodosDataSource />
            </div>
          </div>
        </div>
        {/* Drag Overlay */}
        <DragOverlay>
          {activeWidget ? <WidgetPreview type={activeWidget} /> : null}
        </DragOverlay>
        {/* Floating Edit Mode Indicator */}
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 dark:bg-gray-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center space-x-3 transition-transform duration-300 ease-in-out ${
            isToolboxOpen ? "translate-y-0" : "translate-y-20" // Slide up/down
          }`}
        >
          <span>You are in edit mode</span>
          <Button
            variant="ghost"
            size="icon" // Use icon size
            className="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white rounded-full h-6 w-6" // Adjusted styling
            onClick={toggleToolbox} // Use the existing toggle function
          >
            <X className="h-4 w-4" /> {/* Use X icon */}
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
