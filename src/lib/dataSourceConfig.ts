import {
  LucideIcon,
  Landmark,
  CalendarDays,
  HeartPulse,
  ListTodo,
  ListChecks, // Import the icon for Habits
} from "lucide-react";

// Define the possible IDs for data source panels
export type DataSourceId =
  | "finance"
  | "calendar"
  | "health"
  | "todos"
  | "habits"; // Add 'habits'

// Define the structure for each data source configuration item
export interface DataSourceConfigItem {
  id: DataSourceId;
  label: string; // Tooltip text
  IconComponent: LucideIcon;
}

// Define the configuration array for data source buttons in the sidebar
export const dataSourceConfig: DataSourceConfigItem[] = [
  {
    id: "finance",
    label: "Finance Settings",
    IconComponent: Landmark,
  },
  {
    id: "calendar",
    label: "Calendar Data Source",
    IconComponent: CalendarDays,
  },
  {
    id: "health",
    label: "Health Data Source",
    IconComponent: HeartPulse,
  },
  {
    id: "todos",
    label: "Todos Data Source",
    IconComponent: ListTodo,
  },
  {
    // Add configuration for Habits
    id: "habits",
    label: "Habits Data Source",
    IconComponent: ListChecks,
  },
];
