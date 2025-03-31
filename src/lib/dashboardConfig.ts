import {
  LucideIcon,
  // BarChart3, // Removed unused import
  CalendarCheck,
  CheckSquare,
  CalendarDays,
  BedDouble,
  Target,
  BookOpenText,
  HelpCircle,
  CalendarClock, // Add icon for Daily Calendar
  Footprints, // Add icon for Steps Tracker
} from "lucide-react";

// Widget Groups
export type WidgetGroup = "Tracking" | "Productivity" | "Calendar" | "Other";

// Widget types
export type WidgetType =
  | "Steps Tracker" // Renamed from Trackable Graph
  | "Habit Graph"
  | "Sleep/Step"
  | "Goal Tracker"
  | "To-do List"
  | "Journal"
  | "Month Calendar" // Renamed from Calendar
  | "Daily Calendar" // New
  | "Placeholder";

// Grid item interface used in Dashboard state
export interface GridItem {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

// Available widgets for the toolbox
export const availableWidgets: WidgetType[] = [
  "Steps Tracker", // Renamed
  "Habit Graph",
  "Sleep/Step",
  "Goal Tracker",
  "To-do List",
  "Journal",
  "Month Calendar",
  "Daily Calendar",
  // Placeholder is not available in the toolbox
];

// Default widget layouts for new widgets (adjusted for 24 columns, 30px row height)
export const defaultWidgetLayouts: Record<
  WidgetType,
  { w: number; h: number; minW?: number; minH?: number }
> = {
  "Steps Tracker": { w: 8, h: 5, minW: 3, minH: 2 }, // Renamed, adjusted minW/minH for mini view
  "Habit Graph": { w: 8, h: 5, minW: 6, minH: 4 },
  "Sleep/Step": { w: 6, h: 5, minW: 4, minH: 4 },
  "Goal Tracker": { w: 8, h: 7, minW: 6, minH: 5 },
  "To-do List": { w: 6, h: 7, minW: 4, minH: 5 },
  Journal: { w: 10, h: 7, minW: 8, minH: 5 },
  "Month Calendar": { w: 4, h: 7, minW: 4, minH: 7 }, // Renamed, adjusted size
  "Daily Calendar": { w: 6, h: 7, minW: 4, minH: 5 }, // New
  Placeholder: { w: 12, h: 7, minW: 8, minH: 5 },
};

// Widget Metadata: Icon, Accent Color (Left Border), and Group
export const widgetMetadata: Record<
  WidgetType,
  { icon: LucideIcon; colorAccentClass: string; group: WidgetGroup }
> = {
  "Steps Tracker": {
    // Renamed
    icon: Footprints, // Changed icon
    colorAccentClass: "border-l-blue-500 dark:border-l-blue-400",
    group: "Tracking",
  },
  "Habit Graph": {
    icon: CalendarCheck,
    colorAccentClass: "border-l-green-500 dark:border-l-green-400",
    group: "Tracking",
  },
  "Sleep/Step": {
    icon: BedDouble,
    colorAccentClass: "border-l-indigo-500 dark:border-l-indigo-400",
    group: "Tracking",
  },
  "Goal Tracker": {
    icon: Target,
    colorAccentClass: "border-l-purple-500 dark:border-l-purple-400",
    group: "Tracking",
  },
  "To-do List": {
    icon: CheckSquare,
    colorAccentClass: "border-l-yellow-500 dark:border-l-yellow-400",
    group: "Productivity",
  },
  Journal: {
    icon: BookOpenText,
    colorAccentClass: "border-l-pink-500 dark:border-l-pink-400",
    group: "Productivity",
  },
  "Month Calendar": {
    // Renamed
    icon: CalendarDays,
    colorAccentClass: "border-l-red-500 dark:border-l-red-400",
    group: "Calendar",
  },
  "Daily Calendar": {
    // New
    icon: CalendarClock,
    colorAccentClass: "border-l-orange-500 dark:border-l-orange-400",
    group: "Calendar",
  },
  Placeholder: {
    icon: HelpCircle,
    colorAccentClass: "border-l-gray-300 dark:border-l-gray-700",
    group: "Other",
  },
};

// Mode type
export type Mode = "view" | "edit";
