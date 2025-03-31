import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";

// Define the structure of a calendar event
export interface CalendarEvent {
  id: string;
  date: string; // YYYY-MM-DD format
  title: string;
}

// Define the shape of the context data
interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, "id">) => void;
  deleteEvent: (id: string) => void;
}

// Create the context with a default value
const CalendarContext = createContext<CalendarContextType | undefined>(
  undefined
);

// Define the props for the provider component
interface CalendarProviderProps {
  children: ReactNode;
}

// Create the provider component
export const CalendarProvider: React.FC<CalendarProviderProps> = ({
  children,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    const savedEvents = localStorage.getItem("calendarEvents");
    return savedEvents ? JSON.parse(savedEvents) : [];
  });

  // Persist events to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("calendarEvents", JSON.stringify(events));
  }, [events]);

  // Function to add a new event
  const addEvent = (event: Omit<CalendarEvent, "id">) => {
    const newEvent = { ...event, id: crypto.randomUUID() };
    setEvents((prevEvents) => [...prevEvents, newEvent]);
  };

  // Function to delete an event by ID
  const deleteEvent = (id: string) => {
    setEvents((prevEvents) => prevEvents.filter((event) => event.id !== id));
  };

  // Provide the context value to children
  const value = { events, addEvent, deleteEvent };

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
};

// Custom hook to use the Calendar context
export const useCalendar = (): CalendarContextType => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error("useCalendar must be used within a CalendarProvider");
  }
  return context;
};
