import { GridItem } from "@/lib/dashboardConfig";

// Type for the dashboard name ('default' or 'mobile')
export type DashboardName = "default" | "mobile";

// Type for the data structure stored in localStorage (without minW/minH)
export type CachedGridItemData = Omit<GridItem, "minW" | "minH">;

// Type for the saved state related to Paths progression
export interface SavedPathState {
  activePathName: string | null;
  unlockedItems: Record<string, boolean>;
  currentPathProgressXP: number;
}
