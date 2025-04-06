import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { GridItem } from "@/lib/dashboardConfig"; // Import GridItem

// Define the shape of the config map
// Using Record<string, any> for config for now, can be refined if needed
type WidgetConfigs = Record<string, GridItem["config"] | undefined>;

// Define the shape of the context data
interface DashboardConfigContextType {
  widgetConfigs: WidgetConfigs;
  setWidgetConfig: (widgetId: string, newConfig: GridItem["config"]) => void;
  initializeConfigs: (initialConfigs: WidgetConfigs) => void;
}

// Create the context with a default value (or undefined if you handle it)
const DashboardConfigContext = createContext<
  DashboardConfigContextType | undefined
>(undefined);

// Create the provider component
interface DashboardConfigProviderProps {
  children: ReactNode;
}

export const DashboardConfigProvider: React.FC<
  DashboardConfigProviderProps
> = ({ children }) => {
  // State to hold the map of widget IDs to their configs
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfigs>({});

  // Function to update or add a specific widget's config
  const setWidgetConfig = useCallback(
    (widgetId: string, newConfig: GridItem["config"]) => {
      setWidgetConfigs((prevConfigs) => {
        // Removed console.log
        // Create a new object to ensure state update triggers re-renders
        return {
          ...prevConfigs,
          [widgetId]: newConfig,
        };
      });
    },
    []
  );

  // Function to initialize or reset all configs (e.g., on layout load)
  const initializeConfigs = useCallback((initialConfigs: WidgetConfigs) => {
    // Removed console.log
    setWidgetConfigs(initialConfigs || {}); // Ensure it's always an object
  }, []);

  // Value provided to consuming components
  const value = { widgetConfigs, setWidgetConfig, initializeConfigs };

  return (
    <DashboardConfigContext.Provider value={value}>
      {children}
    </DashboardConfigContext.Provider>
  );
};

// Custom hook for easy consumption of the context
export const useDashboardConfig = (): DashboardConfigContextType => {
  const context = useContext(DashboardConfigContext);
  if (context === undefined) {
    throw new Error(
      "useDashboardConfig must be used within a DashboardConfigProvider"
    );
  }
  return context;
};
