import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  ReactNode,
} from "react";
import { DataSourceId } from "@/lib/dataSourceConfig"; // Assuming DataSourceId covers all relevant data source panels

// Define the possible Panel IDs
// This combines data sources and other specific panels
export type PanelId =
  | DataSourceId // Includes 'calendar', 'health', 'todos', 'finance', 'habits', 'quests'
  | "yuzu"
  | "userProfile"
  | "paths";

interface PanelManagerContextType {
  openPanelId: PanelId | null;
  isPanelOpen: (panelId: PanelId) => boolean;
  openPanel: (panelId: PanelId) => void;
  closePanel: () => void;
}

const PanelManagerContext = createContext<PanelManagerContextType | undefined>(
  undefined
);

interface PanelManagerProviderProps {
  children: ReactNode;
}

export const PanelManagerProvider: React.FC<PanelManagerProviderProps> = ({
  children,
}) => {
  const [openPanelId, setOpenPanelId] = useState<PanelId | null>(null);

  const openPanel = useCallback((panelId: PanelId) => {
    setOpenPanelId(panelId);
  }, []);

  const closePanel = useCallback(() => {
    setOpenPanelId(null);
  }, []);

  const isPanelOpen = useCallback(
    (panelId: PanelId) => {
      return openPanelId === panelId;
    },
    [openPanelId]
  );

  const value = {
    openPanelId,
    isPanelOpen,
    openPanel,
    closePanel,
  };

  return (
    <PanelManagerContext.Provider value={value}>
      {children}
    </PanelManagerContext.Provider>
  );
};

export const usePanelManager = (): PanelManagerContextType => {
  const context = useContext(PanelManagerContext);
  if (context === undefined) {
    throw new Error(
      "usePanelManager must be used within a PanelManagerProvider"
    );
  }
  return context;
};
