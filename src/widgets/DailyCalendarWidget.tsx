import React, { useMemo } from "react"; // Removed useState
import {
  useCalendar,
  CalendarEvent as ContextCalendarEvent,
} from "@/contexts/CalendarContext"; // Import useCalendar hook and type
import { format } from "date-fns"; // Import date-fns for formatting
// Removed Button and ChevronDown imports

interface DailyCalendarWidgetProps {
  id: string; // All widgets receive an ID
}

// Removed internal CalendarEvent interface

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DailyCalendarWidget({ id: _id }: DailyCalendarWidgetProps) {
  // Add ESLint disable comment
  // Prefix unused id with _
  const { events } = useCalendar(); // Get events from context
  // Removed showCompleted state

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const todayDateString = format(today, "yyyy-MM-dd"); // Format today's date for comparison

  // --- Event Filtering Logic ---

  // Removed sample event data
  // Removed time parsing helper function

  // Memoize filtered events for today
  const todaysEvents = useMemo(() => {
    return events.filter((event) => event.date === todayDateString);
    // Removed sorting and upcoming/completed logic
  }, [events, todayDateString]); // Depend on events and today's date string

  // Colors for the circles (Tailwind classes)
  const colorClasses = [
    "bg-red-500",
    "bg-blue-500",
    "bg-green-500",
    "bg-yellow-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-indigo-500",
    "bg-teal-500",
    "bg-orange-500",
  ];

  // Function to get a consistent color class based on event name
  const getColorClassForEvent = (str: string) => {
    // Renamed function and added parameter
    // Use a simple hash function for consistent colors per event name
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      // Use str parameter
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
      hash = hash & hash; // Convert to 32bit integer
    }
    const index = Math.abs(hash) % colorClasses.length;
    return colorClasses[index];
  };

  // Reusable Event Item Component - Simplified
  const EventItem = ({ event }: { event: ContextCalendarEvent }) => (
    <li className="flex items-center gap-2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClassForEvent(
          event.title // Use title from context event
        )}`}
      ></div>
      <span className="flex-1 text-sm truncate text-gray-800 dark:text-gray-200">
        {event.title} {/* Display title */}
      </span>
      {/* Removed time display */}
    </li>
  );

  return (
    <div className="h-full flex flex-col">
      {/* Header - Adjusted layout */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0 flex items-center justify-between">
        {/* Date */}
        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {formattedDate}
        </p>
        {/* Removed Completed Events Toggle Button */}
      </div>

      {/* Event List Area - Simplified */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Removed completed/upcoming distinction */}
        {todaysEvents.length > 0 ? (
          <ul className="space-y-1">
            {todaysEvents.map((event) => (
              // Use event.id from context as key
              <EventItem key={event.id} event={event} />
            ))}
          </ul>
        ) : (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            No events scheduled for today.
          </p>
        )}
      </div>
    </div>
  );
}
