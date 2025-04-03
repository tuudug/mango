import {
  GridItem,
  WidgetType,
  defaultWidgetLayouts,
} from "@/lib/dashboardConfig";
import {
  LAYOUT_CACHE_KEY_PREFIX,
  LAST_SYNC_TIME_KEY,
  PATH_STATE_STORAGE_KEY,
} from "./constants";
import { DashboardName, CachedGridItemData, SavedPathState } from "./types";

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
        // Ensure minW/minH are added back from defaults if missing
        return parsedLayout.map((item: CachedGridItemData) => {
          const itemType = item.type as WidgetType;
          const defaults = defaultWidgetLayouts[itemType]
            ? defaultWidgetLayouts[itemType]
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
    console.error(`Error loading cached layout for ${name}:`, error);
  }
  return null;
};

// Function to set cached layout
export const setCachedLayout = (name: DashboardName, layout: GridItem[]) => {
  try {
    const key = `${LAYOUT_CACHE_KEY_PREFIX}${name}`;
    // Filter out minW/minH before saving if they exist, RGL adds them back
    const itemsToCache: CachedGridItemData[] = layout.map(
      ({ minW, minH, ...rest }) => rest
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
