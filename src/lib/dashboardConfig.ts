// Import types moved to widgetConfig.ts if needed elsewhere, or remove if only used here
// import { WidgetType } from './widgetConfig';

// Grid item interface used in Dashboard state
// This might still be relevant if used directly by Dashboard/Grid components
export interface GridItem {
  id: string;
  type: string; // Keep type generic here or import WidgetType if needed widely
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  config?: Record<string, any>; // Add optional config object for widget-specific settings
}

// Mode type - This seems general enough to potentially stay here
export type Mode = "view" | "edit";

// Note: All widget-specific constants (availableWidgets, defaultWidgetLayouts, widgetMetadata)
// and types (WidgetType, WidgetGroup) have been moved to src/lib/widgetConfig.ts
