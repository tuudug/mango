import { create } from "zustand";

interface SparksState {
  totalSparks: number;
  // Future actions can be added here:
  // allocateSparks: (amount: number) => void;
  // earnSparks: (amount: number) => void;
}

export const useSparksStore = create<SparksState>(() => ({
  totalSparks: 1000, // Placeholder value from the original context
  // No actions defined for now, matching the original context.
  // Example for future:
  // allocateSparks: (amount) => set(state => ({ totalSparks: state.totalSparks - amount })),
  // earnSparks: (amount) => set(state => ({ totalSparks: state.totalSparks + amount })),
}));
