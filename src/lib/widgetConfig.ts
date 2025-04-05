import React from "react"; // Import React for component types
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
  BarChartHorizontal,
  Timer,
  Volume2,
  Sparkles, // Add icon for Affirmation
  ListChecks, // Import icon for Habits Checklist
  TrendingUp, // Import icon for Habit Streaks
} from "lucide-react";
import { GridItem } from "./dashboardConfig"; // Import GridItem for config type

// Import the specific config component
import { HabitSelectionConfig } from "@/components/widget-configs/HabitSelectionConfig";

// Widget Groups
export type WidgetGroup =
  | "Tracking"
  | "Productivity"
  | "Calendar"
  | "Finance"
  | "Mindfulness/Focus"
  | "Other";

// Widget types - Add Habit Streaks
export type WidgetType =
  | "Steps Tracker"
  | "Habit Graph" // Keep this for now, maybe remove later?
  | "Sleep/Step"
  | "Goal Tracker"
  | "To-do List"
  | "Journal"
  | "Month Calendar"
  | "Daily Calendar"
  | "Daily Summary"
  | "Daily Allowance"
  | "Expenses Report"
  | "Pomodoro"
  | "Ambience"
  | "Affirmation Widget"
  | "Habits Checklist"
  | "Habit Heatmap"
  | "Habit Streaks" // Add Habit Streaks type
  | "Placeholder";

// Available widgets for the toolbox - Add Habit Streaks
export const availableWidgets: WidgetType[] = [
  "Steps Tracker",
  // "Habit Graph", // Maybe hide this old one?
  "Sleep/Step",
  "Goal Tracker",
  "To-do List",
  "Journal",
  "Month Calendar",
  "Daily Calendar",
  "Daily Summary",
  "Daily Allowance",
  "Expenses Report",
  "Pomodoro",
  "Ambience",
  "Affirmation Widget",
  "Habits Checklist",
  "Habit Heatmap",
  "Habit Streaks", // Add Habit Streaks to toolbox
  // Placeholder is not available in the toolbox
];

// Default widget layouts for new widgets - Add Habit Streaks
export const defaultWidgetLayouts: Record<
  WidgetType,
  { w: number; h: number; minW?: number; minH?: number }
> = {
  "Steps Tracker": { w: 8, h: 5, minW: 3, minH: 2 },
  "Habit Graph": { w: 8, h: 5, minW: 6, minH: 4 }, // Keep old one for now
  "Sleep/Step": { w: 6, h: 5, minW: 4, minH: 4 },
  "Goal Tracker": { w: 8, h: 7, minW: 6, minH: 5 },
  "To-do List": { w: 6, h: 7, minW: 4, minH: 5 },
  Journal: { w: 10, h: 7, minW: 8, minH: 5 },
  "Month Calendar": { w: 4, h: 7, minW: 4, minH: 7 },
  "Daily Calendar": { w: 6, h: 7, minW: 4, minH: 5 },
  "Daily Summary": { w: 6, h: 7, minW: 5, minH: 6 },
  "Daily Allowance": { w: 6, h: 5, minW: 4, minH: 4 },
  "Expenses Report": { w: 10, h: 7, minW: 8, minH: 5 },
  Pomodoro: { w: 4, h: 4, minW: 3, minH: 3 },
  Ambience: { w: 4, h: 4, minW: 3, minH: 3 },
  "Affirmation Widget": { w: 6, h: 3, minW: 4, minH: 2 },
  "Habits Checklist": { w: 4, h: 6, minW: 3, minH: 4 },
  "Habit Heatmap": { w: 8, h: 4, minW: 6, minH: 3 },
  "Habit Streaks": { w: 4, h: 4, minW: 3, minH: 3 }, // Add Habit Streaks layout
  Placeholder: { w: 12, h: 7, minW: 8, minH: 5 },
};

// Widget Metadata: Icon, Accent Color (Left Border), and Group - Add Habit Streaks
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
    // Keep old one for now
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
    colorAccentClass: "border-l-cyan-400",
    group: "Finance",
  },
  Pomodoro: {
    icon: Timer,
    colorAccentClass: "border-l-red-500",
    group: "Mindfulness/Focus",
  },
  Ambience: {
    icon: Volume2,
    colorAccentClass: "border-l-sky-400",
    group: "Mindfulness/Focus",
  },
  "Affirmation Widget": {
    icon: Sparkles,
    colorAccentClass: "border-l-amber-400",
    group: "Mindfulness/Focus",
  },
  "Habits Checklist": {
    icon: ListChecks,
    colorAccentClass: "border-l-lime-500",
    group: "Tracking",
  },
  "Habit Heatmap": {
    icon: CalendarCheck, // Reuse icon
    colorAccentClass: "border-l-teal-500",
    group: "Tracking",
  },
  "Habit Streaks": {
    // Add Habit Streaks metadata
    icon: TrendingUp,
    colorAccentClass: "border-l-orange-500", // Choose color
    group: "Tracking",
  },
  Placeholder: {
    icon: HelpCircle,
    colorAccentClass: "border-l-gray-700",
    group: "Other",
  },
};

// --- NEW: Widget Configuration Component Mapping ---

// Define the props expected by specific config components
export interface WidgetConfigComponentProps {
  config: GridItem["config"];
  onChange: (newConfig: GridItem["config"]) => void;
}

// Map WidgetType to its specific configuration component (or null if none)
export const widgetConfigComponents: Record<
  WidgetType,
  React.ComponentType<WidgetConfigComponentProps> | null
> = {
  "Steps Tracker": null,
  "Habit Graph": null, // No config planned
  "Sleep/Step": null,
  "Goal Tracker": null,
  "To-do List": null,
  Journal: null,
  "Month Calendar": null,
  "Daily Calendar": null,
  "Daily Summary": null,
  "Daily Allowance": null,
  "Expenses Report": null,
  Pomodoro: null,
  Ambience: null,
  "Affirmation Widget": null,
  "Habits Checklist": null,
  "Habit Heatmap": HabitSelectionConfig, // Use the new component
  "Habit Streaks": HabitSelectionConfig, // Use the new component
  Placeholder: null,
};
