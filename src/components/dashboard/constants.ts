import { GridItem, defaultWidgetLayouts } from "@/lib/dashboardConfig";
import { nanoid } from "nanoid";

// --- Local Storage Keys & Constants ---
export const PATH_STATE_STORAGE_KEY = "dashboardPathState";
export const LAYOUT_CACHE_KEY_PREFIX = "mango_dashboard_layout_";
export const LAST_SYNC_TIME_KEY = "mango_dashboard_last_sync_time";
export const CACHE_STALE_DURATION = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

// Placeholder: Define paths data structure here or import it
// TODO: Consider moving this to a separate config file if it grows larger
export const pathsData = [
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

// Default layout if none is found in DB or cache
export const getDefaultLayout = (): GridItem[] => [
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
export const standardBreakpoints = {
  lg: 1200,
  md: 996,
  sm: 768,
  xs: 480,
  xxs: 0,
};
export const standardCols = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 };

// Define fixed breakpoints and cols for mobile edit view
export const mobileBreakpoints = { mobile: 376 }; // Single breakpoint name
export const mobileCols = { mobile: 4 }; // Force 4 columns for this breakpoint
