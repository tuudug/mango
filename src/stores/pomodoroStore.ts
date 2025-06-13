import { create } from 'zustand';

export type PomodoroState = "idle" | "work" | "break";

interface PomodoroStoreState {
  pomodoroState: PomodoroState;
  setPomodoroState: (newState: PomodoroState) => void;
}

export const usePomodoroStore = create<PomodoroStoreState>((set) => ({
  pomodoroState: 'idle',
  setPomodoroState: (newState: PomodoroState) => set({ pomodoroState: newState }),
}));
