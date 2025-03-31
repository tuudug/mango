import React, { useState, useMemo } from "react"; // Added useMemo
import { useCalendar } from "@/contexts/CalendarContext"; // Import context hook
import { format } from "date-fns"; // Import date utility

interface MonthCalendarWidgetProps {
  // Renamed interface
  id: string;
}

export const MonthCalendarWidget: React.FC<MonthCalendarWidgetProps> = ({
  id: _id, // Prefix unused id
}) => {
  // Renamed component
  const { events } = useCalendar(); // Get events from context
  // Get current date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Get month and year
  const month = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();

  // Get days in month
  const daysInMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() + 1,
    0
  ).getDate();

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  ).getDay();

  // Create array of day names
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Create array of days
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Create array of blank days to fill in before first day of month
  const blankDays = Array.from({ length: firstDayOfMonth }, () => null);

  // Combine blank days and days
  const allDays = [...blankDays, ...days];

  // Navigate to previous month
  const prevMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );
  };

  // Navigate to next month
  const nextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );
  };

  // Check if a day is today
  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  // Memoize the set of event dates for the current month for quick lookup
  const eventDatesInMonth = useMemo(() => {
    const dates = new Set<string>();
    const currentMonthStr = format(currentDate, "yyyy-MM"); // e.g., "2024-03"
    events.forEach((event) => {
      if (event.date.startsWith(currentMonthStr)) {
        dates.add(event.date); // Add the full "YYYY-MM-DD" string
      }
    });
    return dates;
  }, [events, currentDate]);

  // Check if a specific day in the current month has an event
  const hasEvent = (day: number | null): boolean => {
    if (day === null) return false;
    const dateString = format(
      new Date(currentDate.getFullYear(), currentDate.getMonth(), day),
      "yyyy-MM-dd"
    );
    return eventDatesInMonth.has(dateString);
  };

  return (
    // Added dark mode classes
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-700 dark:text-gray-300">
      <div className="flex justify-between items-center mb-2"></div>
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-2">
        {" "}
        {/* Reduced margin */}
        <button
          onClick={prevMonth}
          className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" // Dark mode hover
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600 dark:text-gray-400" // Dark mode icon color
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <span className="font-medium text-sm text-gray-800 dark:text-gray-100">
          {" "}
          {/* Dark mode text */}
          {month} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" // Dark mode hover
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-gray-600 dark:text-gray-400" // Dark mode icon color
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>
      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 gap-0.5 p-0.5">
        {" "}
        {/* Reduced gap and padding */}
        {/* Day names */}
        {dayNames.map((day) => (
          <div
            key={day}
            className="text-center text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-0.5" // Reduced font size
          >
            {day}
          </div>
        ))}
        {/* Days */}
        {allDays.map((day, index) => (
          <div
            key={`day-${index}`}
            className={`relative min-h-[20px] flex flex-col items-center justify-center text-[10px] ${
              // Fixed minimum height and reduced font
              day === null ? "invisible" : ""
            }
              ${
                isToday(day as number)
                  ? "bg-blue-500 dark:bg-blue-600 text-white font-bold"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              }
            `}
          >
            {day}
            {/* Event dot - made smaller */}
            {day !== null && hasEvent(day) && (
              <div className="absolute bottom-0 w-0.5 h-0.5 rounded-full bg-red-500 dark:bg-red-400"></div>
            )}
          </div>
        ))}
      </div>
      {/* Removed Widget ID display */}
    </div>
  );
};
