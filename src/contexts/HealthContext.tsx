import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

// Define the structure for daily step data
export interface DailySteps {
  date: string; // YYYY-MM-DD format
  steps: number;
}

// Define the shape of the context data
interface HealthContextType {
  stepData: DailySteps[];
  addOrUpdateSteps: (entry: DailySteps) => void;
  // Deletion might not be necessary for steps, but could be added later if needed
}

// Create the context with a default value
const HealthContext = createContext<HealthContextType | undefined>(undefined);

// Define the props for the provider component
interface HealthProviderProps {
  children: ReactNode;
}

// Create the provider component
export const HealthProvider: React.FC<HealthProviderProps> = ({ children }) => {
  const [stepData, setStepData] = useState<DailySteps[]>(() => {
    const savedSteps = localStorage.getItem("healthStepData");
    return savedSteps ? JSON.parse(savedSteps) : [];
  });

  // Persist step data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("healthStepData", JSON.stringify(stepData));
  }, [stepData]);

  // Function to add a new step entry or update an existing one for a specific date
  const addOrUpdateSteps = (entry: DailySteps) => {
    setStepData((prevData) => {
      const existingIndex = prevData.findIndex(
        (item) => item.date === entry.date
      );
      if (existingIndex > -1) {
        // Update existing entry
        const newData = [...prevData];
        newData[existingIndex] = entry;
        return newData;
      } else {
        // Add new entry
        return [...prevData, entry];
      }
    });
  };

  // Provide the context value to children
  const value = { stepData, addOrUpdateSteps };

  return (
    <HealthContext.Provider value={value}>{children}</HealthContext.Provider>
  );
};

// Custom hook to use the Health context
export const useHealth = (): HealthContextType => {
  const context = useContext(HealthContext);
  if (context === undefined) {
    throw new Error("useHealth must be used within a HealthProvider");
  }
  return context;
};
