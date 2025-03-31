import React, { useState, useMemo } from "react"; // Import useState and useMemo
import { Button } from "@/components/ui/button"; // Import Button component
import { ChevronDown } from "lucide-react"; // Import icons, removed ChevronUp

interface DailyCalendarWidgetProps {
  id: string; // All widgets receive an ID
}

interface CalendarEvent {
  name: string;
  time: string; // e.g., "9:00 AM"
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DailyCalendarWidget({ id: _id }: DailyCalendarWidgetProps) {
  // Add ESLint disable comment
  // Prefix unused id with _
  const [showCompleted, setShowCompleted] = useState(false); // State for visibility

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // --- Event Filtering Logic ---

  // Sample event data for today
  const sampleEvents: CalendarEvent[] = [
    { name: "Morning Standup", time: "9:00 AM" },
    { name: "Team Meeting", time: "10:00 AM" },
    { name: "Client Call", time: "11:30 AM" },
    { name: "Lunch Break", time: "12:30 PM" },
    { name: "Project Work", time: "1:30 PM" },
    { name: "Code Review", time: "3:00 PM" },
    { name: "Planning Session", time: "4:00 PM" },
    { name: "Gym", time: "6:00 PM" },
    { name: "Dinner", time: "7:30 PM" },
  ];

  // Helper to parse time string (e.g., "9:00 AM") into a Date object for today
  const parseTimeString = (timeString: string): Date => {
    const now = new Date();
    const [time, modifier] = timeString.split(" ");
    // Use const for minutes as it's not reassigned
    let hours: number;
    const [parsedHours, minutes] = time.split(":").map(Number);
    hours = parsedHours;

    if (modifier === "PM" && hours < 12) hours += 12;
    if (modifier === "AM" && hours === 12) hours = 0; // Midnight case

    const eventDate = new Date(now);
    eventDate.setHours(hours, minutes || 0, 0, 0); // Set hours, minutes (default 0), seconds, ms
    return eventDate;
  };

  // Memoize filtered events to avoid recalculation on every render
  const { upcomingEvents, completedEvents } = useMemo(() => {
    const now = new Date(); // Get current time
    const upcoming: CalendarEvent[] = [];
    const completed: CalendarEvent[] = [];

    sampleEvents.forEach((event) => {
      const eventTime = parseTimeString(event.time);
      if (eventTime >= now) {
        upcoming.push(event);
      } else {
        completed.push(event);
      }
    });
    // Sort completed events descending by time (most recent first)
    completed.sort(
      (a, b) =>
        parseTimeString(b.time).getTime() - parseTimeString(a.time).getTime()
    );
    return { upcomingEvents: upcoming, completedEvents: completed };
  }, []); // Recalculate only if sampleEvents changes (which it won't here)

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

  // Reusable Event Item Component
  const EventItem = ({
    event,
    isCompleted,
  }: {
    event: CalendarEvent;
    isCompleted?: boolean;
  }) => (
    <li
      className={`flex items-center gap-2 p-1.5 rounded ${
        isCompleted ? "opacity-70" : ""
      } hover:bg-gray-100 dark:hover:bg-gray-700`}
    >
      <div
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClassForEvent(
          event.name
        )}`}
      ></div>
      <span
        className={`flex-1 text-sm truncate ${
          isCompleted
            ? "text-gray-600 dark:text-gray-400"
            : "text-gray-800 dark:text-gray-200"
        }`}
      >
        {event.name}
      </span>
      <span
        className={`text-xs ${
          isCompleted
            ? "text-gray-400 dark:text-gray-500"
            : "text-gray-500 dark:text-gray-400"
        }`}
      >
        {event.time}
      </span>
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
        {/* Completed Events Toggle Button */}
        {completedEvents.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-1 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {/* Animated Chevron */}
            <ChevronDown
              size={12}
              className={`transition-transform duration-300 ${
                showCompleted ? "rotate-180" : ""
              }`}
            />
            {completedEvents.length} completed event
            {completedEvents.length !== 1 ? "s" : ""}
          </Button>
        )}
      </div>

      {/* Event List Area */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Completed Events (Animated Container) */}
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${
            showCompleted ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0" // Adjust max-h if needed
          }`}
        >
          {completedEvents.length > 0 && (
            <>
              <ul className="space-y-1 mb-3 pt-1">
                {" "}
                {/* Added pt-1 for spacing */}
                {completedEvents.map((event, index) => (
                  <EventItem key={`comp-${index}`} event={event} isCompleted />
                ))}
              </ul>
              <hr className="border-gray-200 dark:border-gray-600 my-2" />
            </>
          )}
        </div>

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 ? (
          <ul className="space-y-1">
            {upcomingEvents.map((event, index) => (
              <EventItem key={`up-${index}`} event={event} />
            ))}
          </ul>
        ) : (
          // Show message only if no upcoming events AND completed are hidden or non-existent
          (!showCompleted || completedEvents.length === 0) && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              No upcoming events for today.
            </p>
          )
        )}
        {/* Show message if only completed events exist but are hidden */}
        {upcomingEvents.length === 0 &&
          completedEvents.length > 0 &&
          !showCompleted && (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
              No upcoming events. Expand completed events above.
            </p>
          )}
      </div>
    </div>
  );
}
