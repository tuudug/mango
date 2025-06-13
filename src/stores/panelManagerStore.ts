import { create } from 'zustand';
import { DataSourceId } from '@/lib/dataSourceConfig';

export type PanelId = DataSourceId | "yuzu" | "userProfile" | "paths";

interface PanelManagerState {
  openPanelId: PanelId | null;
  openPanel: (panelId: PanelId) => void;
  closePanel: () => void;
}

export const usePanelManagerStore = create<PanelManagerState>((set) => ({
  openPanelId: null,
  openPanel: (panelId: PanelId) => set({ openPanelId: panelId }),
  closePanel: () => set({ openPanelId: null }),
}));
