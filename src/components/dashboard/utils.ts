// Update imports to point to correct config files
import { GridItem } from "@/lib/dashboardConfig";
import { WidgetType, defaultWidgetLayouts } from "@/lib/widgetConfig"; // Import from new location
import {
  LAYOUT_CACHE_KEY_PREFIX,
  LAST_SYNC_TIME_KEY,
  PATH_STATE_STORAGE_KEY,
  standardBreakpoints, // Import standard breakpoints
} from "./constants";
import { DashboardName, CachedGridItemData, SavedPathState } from "./types";

// --- Breakpoint Check ---

/**
 * Checks if the current window width is below the mobile breakpoint (sm).
 * @returns {boolean} True if the viewport is considered mobile, false otherwise.
 */
export const isMobileView = (): boolean => {
  // Ensure this runs only client-side
  if (typeof window === "undefined") {
    return false; // Default to false during SSR or build time
  }
  // Use the 'sm' breakpoint from standardBreakpoints
  return window.innerWidth < standardBreakpoints.sm;
};

// --- Local Storage Helper Functions ---

// Function to get cached layout
export const getCachedLayout = (name: DashboardName): GridItem[] | null => {
  try {
    const key = `${LAYOUT_CACHE_KEY_PREFIX}${name}`;
    const savedLayout = localStorage.getItem(key);
    if (savedLayout) {
      const parsedLayout = JSON.parse(savedLayout);
      // Basic validation
      if (Array.isArray(parsedLayout)) {
        // Ensure minW/minH are added back from defaults and config is preserved
        return parsedLayout.map((item: CachedGridItemData) => {
          // item might have config
          const itemType = item.type as WidgetType;
          const defaults = defaultWidgetLayouts[itemType]
            ? defaultWidgetLayouts[itemType]
            : { w: 6, h: 4, minW: 2, minH: 2 };
          return {
            ...item, // This includes id, type, x, y, w, h, and config if present
            minW: defaults.minW,
            minH: defaults.minH,
          };
        });
      }
    }
  } catch (error) {
    console.error(`Error loading cached layout for ${name}:`, error);
  }
  return null;
};

// Function to set cached layout
export const setCachedLayout = (name: DashboardName, layout: GridItem[]) => {
  try {
    const key = `${LAYOUT_CACHE_KEY_PREFIX}${name}`;
    // Filter out minW/minH but explicitly keep config
    const itemsToCache: CachedGridItemData[] = layout.map(
      ({ minW, minH, ...rest }) => ({
        // Destructure minW/minH out
        id: rest.id,
        type: rest.type,
        x: rest.x,
        y: rest.y,
        w: rest.w,
        h: rest.h,
        config: rest.config, // Explicitly include config
      })
    );
    localStorage.setItem(key, JSON.stringify(itemsToCache));
    console.log(`Layout for ${name} cached successfully.`);
  } catch (error) {
    console.error(`Error saving cached layout for ${name}:`, error);
  }
};

// Function to get last sync time
export const getCachedLastSyncTime = (): number | null => {
  try {
    const savedTime = localStorage.getItem(LAST_SYNC_TIME_KEY);
    if (savedTime) {
      const parsedTime = parseInt(savedTime, 10);
      if (!isNaN(parsedTime)) {
        return parsedTime;
      }
    }
  } catch (error) {
    console.error("Error loading last sync time:", error);
  }
  return null;
};

// Function to set last sync time
export const setCachedLastSyncTime = (timestamp: number) => {
  try {
    localStorage.setItem(LAST_SYNC_TIME_KEY, timestamp.toString());
    console.log("Last sync time updated:", new Date(timestamp).toISOString());
  } catch (error) {
    console.error("Error saving last sync time:", error);
  }
};

// Function to load path state from localStorage
export const loadPathStateFromLocalStorage = (): SavedPathState => {
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
  // Return default state if nothing found or error occurred
  return {
    activePathName: null,
    unlockedItems: {
      "To-Do List": true, // Default unlocked items
      "Steps Tracker": true,
      Journal: true,
    },
    currentPathProgressXP: 0,
  };
};

// Function to save path state to localStorage
export const savePathStateToLocalStorage = (state: SavedPathState) => {
  try {
    localStorage.setItem(PATH_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Error saving path state to localStorage:", error);
  }
};

// --- Layout Comparison Function ---

/**
 * Deeply compares two dashboard layouts (arrays of GridItem).
 * Ignores minW and minH properties as they are derived.
 * Compares the config object using JSON stringification.
 * Sorts items by ID before comparison to handle potential order differences.
 */
export const deepCompareLayouts = (
  layout1: GridItem[] | null | undefined,
  layout2: GridItem[] | null | undefined
): boolean => {
  if (layout1 === layout2) return true; // Same instance or both null/undefined
  if (!layout1 || !layout2) return false; // One is null/undefined, the other isn't
  if (layout1.length !== layout2.length) return false; // Different number of items

  // Sort both arrays by item ID for consistent comparison
  const sortedLayout1 = [...layout1].sort((a, b) => a.id.localeCompare(b.id));
  const sortedLayout2 = [...layout2].sort((a, b) => a.id.localeCompare(b.id));

  for (let i = 0; i < sortedLayout1.length; i++) {
    const item1 = sortedLayout1[i];
    const item2 = sortedLayout2[i];

    // Compare relevant properties including config
    if (
      item1.id !== item2.id ||
      item1.type !== item2.type ||
      item1.x !== item2.x ||
      item1.y !== item2.y ||
      item1.w !== item2.w ||
      item1.h !== item2.h ||
      // Compare config objects using JSON stringify for simple deep comparison
      JSON.stringify(item1.config || {}) !== JSON.stringify(item2.config || {})
    ) {
      return false; // Found a difference
    }
  }

  return true; // No differences found
};
