import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
} from "react";
// import { Sparkles as SparkIcon } from "lucide-react"; // Import SparkIcon

interface SparksContextType {
  totalSparks: number;
  // In the future, add functions here for allocating/earning sparks
  // allocateSparks: (amount: number) => void;
  // earnSparks: (amount: number) => void;
}

const SparksContext = createContext<SparksContextType | undefined>(undefined);

interface SparksProviderProps {
  children: ReactNode;
}

export const SparksProvider: React.FC<SparksProviderProps> = ({ children }) => {
  // For now, totalSparks is static. In the future, this would come from user state/API.
  const [totalSparks /* setTotalSparks */] = useState<number>(1000); // Static placeholder value

  // Memoize the context value
  const value = useMemo(
    () => ({
      totalSparks,
      // Future functions here
      // allocateSparks: (amount: number) => { /* logic */ },
      // earnSparks: (amount: number) => { /* logic */ },
    }),
    [totalSparks]
  );

  return (
    <SparksContext.Provider value={value}>{children}</SparksContext.Provider>
  );
};

// Custom hook to use the Sparks context
export const useSparks = (): SparksContextType => {
  const context = useContext(SparksContext);
  if (context === undefined) {
    throw new Error("useSparks must be used within a SparksProvider");
  }
  return context;
};
