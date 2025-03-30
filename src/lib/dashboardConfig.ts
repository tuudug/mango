import {
  LucideIcon,
  BarChart3,
  CalendarCheck,
  CheckSquare,
  CalendarDays,
  BedDouble,
  Target,
  BookOpenText,
  HelpCircle,
} from "lucide-react";

// Widget types
export type WidgetType =
  | "Trackable Graph"
  | "Habit Graph"
  | "To-do List"
  | "Calendar"
  | "Sleep/Step"
  | "Goal Tracker"
  | "Journal"
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
  "Trackable Graph",
  "Habit Graph",
  "To-do List",
  "Calendar",
  "Sleep/Step",
  "Goal Tracker",
  "Journal",
  // Placeholder is not available in the toolbox
];

// Default widget layouts for new widgets (adjusted for 24 columns, 30px row height)
export const defaultWidgetLayouts: Record<
  WidgetType,
  { w: number; h: number; minW?: number; minH?: number }
> = {
  "Trackable Graph": { w: 8, h: 5, minW: 6, minH: 4 }, // 4*2=8, 3*1.67=5
  "Habit Graph": { w: 8, h: 5, minW: 6, minH: 4 }, // 4*2=8, 3*1.67=5
  "To-do List": { w: 6, h: 7, minW: 4, minH: 5 }, // 3*2=6, 4*1.67=6.68 -> 7
  Calendar: { w: 4, h: 7, minW: 4, minH: 7 }, // 5*2=10, 4*1.67=6.68 -> 7
  "Sleep/Step": { w: 6, h: 5, minW: 4, minH: 4 }, // 3*2=6, 3*1.67=5
  "Goal Tracker": { w: 8, h: 7, minW: 6, minH: 5 }, // 4*2=8, 4*1.67=6.68 -> 7
  Journal: { w: 10, h: 7, minW: 8, minH: 5 }, // 5*2=10, 4*1.67=6.68 -> 7
  Placeholder: { w: 12, h: 7, minW: 8, minH: 5 }, // 6*2=12, 4*1.67=6.68 -> 7
};

// Widget Metadata: Icon and Accent Color (Left Border)
export const widgetMetadata: Record<
  WidgetType,
  { icon: LucideIcon; colorAccentClass: string }
> = {
  "Trackable Graph": {
    icon: BarChart3,
    colorAccentClass: "border-l-blue-500 dark:border-l-blue-400",
  },
  "Habit Graph": {
    icon: CalendarCheck,
    colorAccentClass: "border-l-green-500 dark:border-l-green-400",
  },
  "To-do List": {
    icon: CheckSquare,
    colorAccentClass: "border-l-yellow-500 dark:border-l-yellow-400",
  },
  Calendar: {
    icon: CalendarDays,
    colorAccentClass: "border-l-red-500 dark:border-l-red-400",
  },
  "Sleep/Step": {
    icon: BedDouble,
    colorAccentClass: "border-l-indigo-500 dark:border-l-indigo-400",
  },
  "Goal Tracker": {
    icon: Target,
    colorAccentClass: "border-l-purple-500 dark:border-l-purple-400",
  },
  Journal: {
    icon: BookOpenText,
    colorAccentClass: "border-l-pink-500 dark:border-l-pink-400",
  },
  Placeholder: {
    icon: HelpCircle,
    colorAccentClass: "border-l-gray-300 dark:border-l-gray-700",
  },
};

// Mode type
export type Mode = "view" | "edit";
