import { create } from 'zustand';
import { GridItem } from '@/lib/dashboardConfig'; // Assuming GridItem is correctly typed here

export type WidgetConfigs = Record<string, GridItem["config"] | undefined>;

interface DashboardConfigState {
  widgetConfigs: WidgetConfigs;
  setWidgetConfig: (widgetId: string, newConfig: GridItem["config"]) => void;
  initializeConfigs: (initialConfigs: WidgetConfigs) => void;
}

export const useDashboardConfigStore = create<DashboardConfigState>((set) => ({
  widgetConfigs: {},
  setWidgetConfig: (widgetId: string, newConfig: GridItem["config"]) =>
    set((state) => ({
      widgetConfigs: {
        ...state.widgetConfigs,
        [widgetId]: newConfig,
      },
    })),
  initializeConfigs: (initialConfigs: WidgetConfigs) =>
    set({ widgetConfigs: initialConfigs || {} }),
}));
