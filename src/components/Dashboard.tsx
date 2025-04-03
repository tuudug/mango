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
import { Smartphone, Monitor, X, Loader2 } from "lucide-react"; // Import Loader2
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { useDebouncedCallback } from "use-debounce"; // Import debounce
import { cn } from "@/lib/utils"; // Import cn for conditional classes

// Create responsive grid layout
const ResponsiveGridLayout = WidthProvider(Responsive);

// --- Remove LocalStorage Persistence ---
// const LAYOUT_STORAGE_KEY = "dashboardLayout"; // REMOVED
const PATH_STATE_STORAGE_KEY = "dashboardPathState"; // Keep path state for now

interface SavedPathState {
  activePathName: string | null;
  unlockedItems: Record<string, boolean>;
  currentPathProgressXP: number;
}

// REMOVED loadLayoutFromLocalStorage function

// REMOVED saveLayoutToLocalStorage function

// Function to load path state from localStorage (Keep for now)
const loadPathStateFromLocalStorage = (): SavedPathState => {
  try {
    const savedState = localStorage.getItem(PATH_STATE_STORAGE_KEY);
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      return parsedState;
    }
  } catch (error) {
    console.error("Error loading path state from localStorage:", error);
  }
  return {
    activePathName: null,
    unlockedItems: {
      "To-Do List": true,
      "Steps Tracker": true,
      Journal: true,
    },
    currentPathProgressXP: 0,
  };
};

// Function to save path state to localStorage (Keep for now)
const savePathStateToLocalStorage = (state: SavedPathState) => {
  try {
    localStorage.setItem(PATH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving path state to localStorage:", error);
  }
};
// --- End LocalStorage ---

// Placeholder: Define paths data structure here or import it
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

// Default layout if none is found in DB
const getDefaultLayout = (): GridItem[] => [
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

// Define standard breakpoints and cols for desktop/responsive view
const standardBreakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 };
const standardCols = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 };

// Define fixed breakpoints and cols for mobile edit view
const mobileBreakpoints = { mobile: 376 }; // Single breakpoint name
const mobileCols = { mobile: 4 }; // Force 4 columns for this breakpoint

export function Dashboard() {
  const { user, session } = useAuth(); // Get user and session
  const token = session?.access_token; // Get token from session

  // State
  const [isToolboxOpen, setIsToolboxOpen] = useState(false);
  const [isGameMasterPanelOpen, setIsGameMasterPanelOpen] = useState(false);
  const [isUserProfilePanelOpen, setIsUserProfilePanelOpen] = useState(false);
  const [isPathsPageOpen, setIsPathsPageOpen] = useState(false);
  const [isCalendarDataSourceOpen, setIsCalendarDataSourceOpen] =
    useState(false);
  const [isHealthDataSourceOpen, setIsHealthDataSourceOpen] = useState(false);
  const [isTodosDataSourceOpen, setIsTodosDataSourceOpen] = useState(false);
  // Initialize items as empty array, will be loaded from API
  const [items, setItems] = useState<GridItem[]>([]);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true); // Loading state
  // State to track which dashboard is currently being viewed/saved in view mode
  const [currentViewDashboardName, setCurrentViewDashboardName] =
    useState<string>("default");
  // State to track which dashboard layout is being actively edited
  const [editTargetDashboard, setEditTargetDashboard] =
    useState<string>("default");
  const [activeWidget, setActiveWidget] = useState<WidgetType | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Path State (Keep using localStorage for now)
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
    return nextItem ? nextItem.xpCost : 0;
  }, [activePathName, unlockedItems]);

  // Effect to save path state whenever it changes
  useEffect(() => {
    savePathStateToLocalStorage(pathState);
  }, [pathState]);

  // --- API Interaction ---

  // Debounced function to save layout to the server
  const saveLayoutToServer = useDebouncedCallback(
    async (layoutToSave: GridItem[], dashboardName: string) => {
      if (!token || !user || !dashboardName) return; // Need auth and name
      console.log(`Debounced save triggered for dashboard: ${dashboardName}`);
      try {
        // Filter out minW/minH before saving if they exist
        const itemsToSave = layoutToSave.map(({ minW, minH, ...rest }) => rest);

        const response = await fetch(`/api/dashboards/${dashboardName}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ layout: itemsToSave }), // Send filtered layout data
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error(
            `Error saving layout for ${dashboardName}:`,
            response.status,
            errorData
          );
          // TODO: Add user feedback (e.g., toast notification)
        } else {
          console.log(`Layout for ${dashboardName} saved successfully.`);
        }
      } catch (error) {
        console.error(
          `Network error saving layout for ${dashboardName}:`,
          error
        );
        // TODO: Add user feedback
      }
    },
    1000 // Debounce time in ms (e.g., 1 second)
  );

  // Function to fetch layout (used on mount and when switching edit target)
  const fetchLayout = useCallback(
    async (dashboardName: string) => {
      if (!token || !user) return null; // Return null if not authenticated
      console.log(`Fetching layout for: ${dashboardName}`);
      try {
        const response = await fetch(`/api/dashboards/${dashboardName}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          if (response.status === 404 || response.status === 401) {
            console.warn(
              `Layout fetch for ${dashboardName} failed (${response.status}), returning null.`
            );
            return null; // Return null if not found or unauthorized
          } else {
            throw new Error(
              `API error: ${response.status} ${response.statusText}`
            );
          }
        }
        const data = await response.json();
        if (data.layout && Array.isArray(data.layout)) {
          // Ensure minW/minH are added back from defaults
          const loadedItems = data.layout.map(
            (item: Omit<GridItem, "minW" | "minH">) => {
              const itemType = item.type as WidgetType;
              const defaults = defaultWidgetLayouts[itemType]
                ? defaultWidgetLayouts[itemType]
                : { w: 6, h: 4, minW: 2, minH: 2 };
              return {
                ...item,
                minW: defaults.minW,
                minH: defaults.minH,
              };
            }
          );
          console.log(`Layout for ${dashboardName} fetched successfully.`);
          return loadedItems;
        } else {
          console.log(
            `No layout data found for ${dashboardName}, returning null.`
          );
          return null; // Return null if layout is empty/invalid
        }
      } catch (error) {
        console.error(`Error fetching layout for ${dashboardName}:`, error);
        // TODO: Add user feedback
        return null; // Return null on error
      }
    },
    [token, user] // Dependencies for fetchLayout
  );

  // Effect to load initial layout on mount based on screen width
  useEffect(() => {
    if (!token || !user) {
      console.log("User not authenticated, skipping initial layout load.");
      setItems(getDefaultLayout());
      setIsLoadingLayout(false);
      return;
    }

    const loadInitialLayout = async () => {
      setIsLoadingLayout(true);
      const isMobile = window.innerWidth < 768;
      const initialDashboardName = isMobile ? "mobile" : "default";
      setCurrentViewDashboardName(initialDashboardName);
      setEditTargetDashboard(initialDashboardName); // Start editing the view target

      const layoutData = await fetchLayout(initialDashboardName);
      setItems(layoutData || getDefaultLayout());
      setIsLoadingLayout(false);
    };

    loadInitialLayout();
    // TODO: Add resize listener?
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]); // Only depends on auth state

  // Effect to load layout when editTargetDashboard changes while toolbox is open
  useEffect(() => {
    if (isToolboxOpen && token && user) {
      const loadEditTargetLayout = async () => {
        setIsLoadingLayout(true); // Show loading when switching edit targets
        console.log(`Switching edit target to: ${editTargetDashboard}`);
        const layoutData = await fetchLayout(editTargetDashboard);
        setItems(layoutData || getDefaultLayout());
        setIsLoadingLayout(false);
      };
      loadEditTargetLayout();
    }
    // Don't run this when toolbox closes, only when target changes *while* open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTargetDashboard, isToolboxOpen, fetchLayout]); // Rerun if target or toolbox state changes

  // --- End API Interaction ---

  // Toggle Toolbox (Edit Mode)
  const toggleToolbox = () => {
    setIsToolboxOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        // When opening toolbox, set edit target to the currently viewed dashboard
        setEditTargetDashboard(currentViewDashboardName);
        // Close other panels
        setIsGameMasterPanelOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
        setIsCalendarDataSourceOpen(false);
        setIsHealthDataSourceOpen(false);
        setIsTodosDataSourceOpen(false);
      } else {
        // When closing toolbox, determine the correct layout to view based on screen size
        const isMobile = window.innerWidth < 768;
        const viewTarget = isMobile ? "mobile" : "default";

        // If the currently viewed dashboard isn't the correct one for the screen size,
        // OR if we were editing a different dashboard than the one we should be viewing,
        // reload the correct layout for viewing.
        if (
          currentViewDashboardName !== viewTarget ||
          editTargetDashboard !== viewTarget
        ) {
          console.log(`Exiting edit mode. Loading view target: ${viewTarget}`);
          setIsLoadingLayout(true); // Show loading while switching back
          fetchLayout(viewTarget).then((layoutData) => {
            setItems(layoutData || getDefaultLayout());
            setCurrentViewDashboardName(viewTarget); // Update the current view
            setEditTargetDashboard(viewTarget); // Reset edit target as well
            setIsLoadingLayout(false);
          });
        } else {
          // Reset edit target even if no reload needed
          setEditTargetDashboard(viewTarget);
        }
      }
      return nextIsOpen;
    });
  };

  // Function to toggle between editing 'default' and 'mobile' layouts
  const toggleEditTarget = () => {
    setEditTargetDashboard((prev) =>
      prev === "default" ? "mobile" : "default"
    );
    // Layout loading is handled by the useEffect watching editTargetDashboard
  };

  // Toggle Game Master Panel
  const toggleGameMasterPanel = () => {
    setIsGameMasterPanelOpen((prev) => {
      const nextIsOpen = !prev;
      if (nextIsOpen) {
        setIsToolboxOpen(false);
        setIsUserProfilePanelOpen(false);
        setIsPathsPageOpen(false);
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
        setIsHealthDataSourceOpen(false);
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
        setIsCalendarDataSourceOpen(false);
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
        setIsCalendarDataSourceOpen(false);
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
      currentPathProgressXP: 0,
    }));
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

      // Use correct cols based on edit mode
      const cols = editTargetDashboard === "mobile" ? 4 : 24; // Use 4 for mobile edit

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

        // Adjust gridWidth calculation if in mobile edit mode (fixed width)
        const gridWidth =
          editTargetDashboard === "mobile"
            ? 320 // Example fixed width for mobile edit view
            : gridRect.width -
              sidebarWidth -
              containerPadding[0] * 2 -
              panelWidth;

        const approxCellWidth = gridWidth / cols;
        const approxCellHeight = rowHeight + margin[1];

        gridX = Math.max(
          0,
          Math.min(
            cols - (defaultLayout?.w || 6),
            Math.floor(adjustedX / approxCellWidth)
          )
        );
        // Ensure dropped item fits within mobile width if applicable
        if (editTargetDashboard === "mobile" && defaultLayout?.w > cols) {
          console.warn(`Widget ${widgetType} is too wide for mobile layout.`);
          // Optionally prevent drop or adjust width? For now, let it drop.
          // gridX = 0; // Force to left edge
        }

        gridY = Math.max(0, Math.floor(adjustedY / approxCellHeight));
      }

      const newItem: GridItem = {
        id: nanoid(),
        type: widgetType,
        x: gridX,
        y: gridY,
        ...(defaultLayout || { w: 6, h: 4, minW: 2, minH: 2 }),
      };
      const newItems = [...filteredItems, newItem];
      setItems(newItems);
      // Save when adding item in edit mode
      saveLayoutToServer(newItems, editTargetDashboard);
    }
  };

  // Handle layout changes from react-grid-layout
  const onLayoutChange = useCallback(
    (layout: Layout[]) => {
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
      if (JSON.stringify(items) !== JSON.stringify(newItems)) {
        setItems(newItems);
        // Save to the correct dashboard based on mode
        const targetDashboard = isToolboxOpen
          ? editTargetDashboard
          : currentViewDashboardName;
        saveLayoutToServer(newItems, targetDashboard);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      saveLayoutToServer,
      isToolboxOpen,
      editTargetDashboard,
      currentViewDashboardName,
    ]
  );

  // Handle resize events from react-grid-layout
  const handleResize = useCallback(
    (layout: Layout[], _oldItem: Layout, newItemLayout: Layout) => {
      const newItems = items.map((item) => {
        if (item.id === newItemLayout.i) {
          return { ...item, w: newItemLayout.w, h: newItemLayout.h };
        }
        return item;
      });
      if (JSON.stringify(items) !== JSON.stringify(newItems)) {
        setItems(newItems);
        // Save to the correct dashboard based on mode
        const targetDashboard = isToolboxOpen
          ? editTargetDashboard
          : currentViewDashboardName;
        saveLayoutToServer(newItems, targetDashboard);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      items,
      saveLayoutToServer,
      isToolboxOpen,
      editTargetDashboard,
      currentViewDashboardName,
    ]
  );

  // Function to delete a widget
  const handleDeleteWidget = (idToDelete: string) => {
    const newItems = items.filter((item) => item.id !== idToDelete);
    const targetDashboard = isToolboxOpen
      ? editTargetDashboard
      : currentViewDashboardName;

    if (newItems.length === 0) {
      const placeholderItems = getDefaultLayout();
      setItems(placeholderItems);
      saveLayoutToServer(placeholderItems, targetDashboard);
    } else {
      setItems(newItems);
      saveLayoutToServer(newItems, targetDashboard);
    }
  };

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

  // Configure sensors for dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  // --- Panel Behavior & Styling ---
  // Only toolbox pushes content
  const mainContentPaddingLeft = isToolboxOpen ? "pl-64" : "pl-0";
  // Mobile edit mode styling
  const isMobileEditMode = isToolboxOpen && editTargetDashboard === "mobile";
  const mobileEditWrapperClasses = isMobileEditMode // Renamed class variable
    ? "w-[375px] max-w-[375px] border-2 border-dashed border-blue-500 dark:border-blue-400 mx-auto" // Apply width and border to wrapper
    : "";

  // --- Grid Configuration ---
  // Determine grid props based on mode
  const currentGridCols = isMobileEditMode ? mobileCols : standardCols;
  const currentGridBreakpoints = isMobileEditMode
    ? mobileBreakpoints
    : standardBreakpoints;

  // Don't render the main dashboard structure until auth state is resolved
  if (useAuth().isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  // Common props for both grid layouts
  const commonGridLayoutProps = {
    className: "layout",
    layouts: { lg: generateLayout() }, // RGL uses 'lg' layout if only one breakpoint defined
    rowHeight: 30,
    margin: [10, 10] as [number, number],
    containerPadding: [15, 15] as [number, number],
    isDroppable: false,
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
  const renderGrid = () => {
    if (isMobileEditMode) {
      // Mobile Edit Grid
      return (
        <div className={cn("h-full", mobileEditWrapperClasses)}>
          <SortableContext
            items={items.map((item) => item.id)}
            strategy={rectSortingStrategy}
          >
            <ResponsiveGridLayout
              {...commonGridLayoutProps}
              breakpoints={mobileBreakpoints} // Use mobile breakpoints
              cols={mobileCols} // Use mobile cols
              // WidthProvider should get width from parent div
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  data-grid={generateLayout().find((l) => l.i === item.id)}
                >
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
      // Standard Desktop/Responsive Grid
      return (
        <SortableContext
          items={items.map((item) => item.id)}
          strategy={rectSortingStrategy}
        >
          <ResponsiveGridLayout
            {...commonGridLayoutProps}
            breakpoints={standardBreakpoints} // Use standard breakpoints
            cols={standardCols} // Use standard cols
          >
            {items.map((item) => (
              <div
                key={item.id}
                data-grid={generateLayout().find((l) => l.i === item.id)}
              >
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

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges]}
    >
      {/* Main container */}
      <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 pl-16">
        <LeftSidebar
          isToolboxOpen={isToolboxOpen}
          isGameMasterPanelOpen={isGameMasterPanelOpen}
          isUserProfilePanelOpen={isUserProfilePanelOpen}
          isPathsPageOpen={isPathsPageOpen}
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
          <DashboardHeader />
          <div className="flex-1 relative overflow-hidden w-full">
            {/* Dashboard Grid Area */}
            <Droppable id="dashboard-grid">
              <main
                ref={gridContainerRef}
                className={cn(
                  `absolute inset-0 bg-gray-100 dark:bg-gray-950 overflow-auto transition-padding duration-300 ease-in-out`,
                  mainContentPaddingLeft,
                  // Apply centering ONLY in mobile edit mode
                  isMobileEditMode && "flex justify-center items-start pt-4" // Center content vertically and add padding
                )}
              >
                {/* Show loading indicator inside main area */}
                {isLoadingLayout ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  renderGrid() // Render the appropriate grid
                )}
              </main>
            </Droppable>
            {/* Sliding Panels Container */}
            {/* Toolbox */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isToolboxOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* Pass editTargetDashboard to Toolbox */}
              <WidgetToolbox
                onClose={toggleToolbox}
                editTargetDashboard={editTargetDashboard}
              />
            </div>
            {/* Other Panels (Now overlay) */}
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isGameMasterPanelOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <GameMasterPanel onClose={toggleGameMasterPanel} />
            </div>
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isUserProfilePanelOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <UserProfilePanel onClose={toggleUserProfilePanel} />
            </div>
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 ${
                isPathsPageOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <PathsPage
                onClose={togglePathsPage}
                activePathName={activePathName}
                setActivePath={setActivePath}
                unlockedItems={unlockedItems}
                currentPathProgressXP={currentPathProgressXP}
                nextUnlockXP={nextUnlockXP}
              />
            </div>
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
                isCalendarDataSourceOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <CalendarDataSource />
            </div>
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
                isHealthDataSourceOpen ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              <HealthDataSource />
            </div>
            <div
              className={`absolute top-0 left-0 bottom-0 transition-transform duration-300 ease-in-out z-20 w-80 ${
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
            isToolboxOpen ? "translate-y-0" : "translate-y-20"
          }`}
        >
          {/* Edit Target Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white rounded-full h-6 w-6"
            onClick={toggleEditTarget}
            title={`Switch to editing ${
              editTargetDashboard === "default" ? "Mobile" : "Desktop"
            } layout`}
          >
            {editTargetDashboard === "default" ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </Button>
          {/* Indicator Text */}
          <span>
            Editing {editTargetDashboard === "default" ? "Desktop" : "Mobile"}{" "}
            Layout
          </span>
          {/* Close Edit Mode Button */}
          <Button
            variant="ghost"
            size="icon"
            className="text-gray-300 hover:bg-gray-700 dark:hover:bg-gray-600 hover:text-white rounded-full h-6 w-6"
            onClick={toggleToolbox}
            title="Exit Edit Mode"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </DndContext>
  );
}
