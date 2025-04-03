import {
  LucideIcon,
  CalendarCheck,
  CheckSquare,
  CalendarDays,
  BedDouble,
  Target,
  BookOpenText,
  HelpCircle,
  CalendarClock,
  Footprints,
  LayoutDashboard,
  PiggyBank,
  BarChartHorizontal, // Import report icon
} from "lucide-react";

// Widget Groups
export type WidgetGroup =
  | "Tracking"
  | "Productivity"
  | "Calendar"
  | "Finance" // Add Finance group
  | "Other";

// Widget types
export type WidgetType =
  | "Steps Tracker"
  | "Habit Graph"
  | "Sleep/Step"
  | "Goal Tracker"
  | "To-do List"
  | "Journal"
  | "Month Calendar"
  | "Daily Calendar"
  | "Daily Summary"
  | "Daily Allowance"
  | "Expenses Report" // Add new widget type
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
  "Steps Tracker",
  "Habit Graph",
  "Sleep/Step",
  "Goal Tracker",
  "To-do List",
  "Journal",
  "Month Calendar",
  "Daily Calendar",
  "Daily Summary",
  "Daily Allowance",
  "Expenses Report", // Add to available widgets
  // Placeholder is not available in the toolbox
];

// Default widget layouts for new widgets (adjusted for 24 columns, 30px row height)
export const defaultWidgetLayouts: Record<
  WidgetType,
  { w: number; h: number; minW?: number; minH?: number }
> = {
  "Steps Tracker": { w: 8, h: 5, minW: 3, minH: 2 },
  "Habit Graph": { w: 8, h: 5, minW: 6, minH: 4 },
  "Sleep/Step": { w: 6, h: 5, minW: 4, minH: 4 },
  "Goal Tracker": { w: 8, h: 7, minW: 6, minH: 5 },
  "To-do List": { w: 6, h: 7, minW: 4, minH: 5 },
  Journal: { w: 10, h: 7, minW: 8, minH: 5 },
  "Month Calendar": { w: 4, h: 7, minW: 4, minH: 7 },
  "Daily Calendar": { w: 6, h: 7, minW: 4, minH: 5 },
  "Daily Summary": { w: 6, h: 7, minW: 5, minH: 6 },
  "Daily Allowance": { w: 6, h: 5, minW: 4, minH: 4 },
  "Expenses Report": { w: 10, h: 7, minW: 8, minH: 5 }, // Layout for Expenses Report
  Placeholder: { w: 12, h: 7, minW: 8, minH: 5 },
};

// Widget Metadata: Icon, Accent Color (Left Border), and Group
export const widgetMetadata: Record<
  WidgetType,
  { icon: LucideIcon; colorAccentClass: string; group: WidgetGroup }
> = {
  "Steps Tracker": {
    icon: Footprints,
    colorAccentClass: "border-l-blue-400",
    group: "Tracking",
  },
  "Habit Graph": {
    icon: CalendarCheck,
    colorAccentClass: "border-l-green-400",
    group: "Tracking",
  },
  "Sleep/Step": {
    icon: BedDouble,
    colorAccentClass: "border-l-indigo-400",
    group: "Tracking",
  },
  "Goal Tracker": {
    icon: Target,
    colorAccentClass: "border-l-purple-400",
    group: "Tracking",
  },
  "To-do List": {
    icon: CheckSquare,
    colorAccentClass: "border-l-yellow-400",
    group: "Productivity",
  },
  Journal: {
    icon: BookOpenText,
    colorAccentClass: "border-l-pink-400",
    group: "Productivity",
  },
  "Month Calendar": {
    icon: CalendarDays,
    colorAccentClass: "border-l-red-400",
    group: "Calendar",
  },
  "Daily Calendar": {
    icon: CalendarClock,
    colorAccentClass: "border-l-orange-400",
    group: "Calendar",
  },
  "Daily Summary": {
    icon: LayoutDashboard,
    colorAccentClass: "border-l-teal-400",
    group: "Productivity",
  },
  "Daily Allowance": {
    icon: PiggyBank,
    colorAccentClass: "border-l-emerald-400",
    group: "Finance",
  },
  "Expenses Report": {
    icon: BarChartHorizontal,
    colorAccentClass: "border-l-cyan-400", // Choose a color
    group: "Finance", // Assign to Finance group
  },
  Placeholder: {
    icon: HelpCircle,
    colorAccentClass: "border-l-gray-700",
    group: "Other",
  },
};

// Mode type
export type Mode = "view" | "edit";
