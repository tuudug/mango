import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
} from "react";

export type PomodoroState = "idle" | "work" | "break";

interface PomodoroContextType {
  pomodoroState: PomodoroState;
  setPomodoroState: React.Dispatch<React.SetStateAction<PomodoroState>>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(
  undefined
);

export const PomodoroProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [pomodoroState, setPomodoroState] = useState<PomodoroState>("idle");

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({ pomodoroState, setPomodoroState }),
    [pomodoroState]
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = (): PomodoroContextType => {
  const context = useContext(PomodoroContext);
  if (!context) {
    throw new Error("usePomodoro must be used within a PomodoroProvider");
  }
  return context;
};
