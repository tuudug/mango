import { useCalendar } from "@/contexts/CalendarContext"; // Import useCalendar hook
import { CalendarItem as ContextCalendarItem } from "@/types/datasources"; // Import type directly
import { format, addDays, subDays, isToday } from "date-fns"; // Import date-fns functions (removed isSameDay)
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingBar } from "@/components/ui/loading-bar"; // Import LoadingBar

interface DailyCalendarWidgetProps {
  id: string; // All widgets receive an ID
}

// Removed internal CalendarEvent interface

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DailyCalendarWidget({ id: _id }: DailyCalendarWidgetProps) {
  // Add ESLint disable comment
  // Prefix unused id with _
  const { events, isLoading, error } = useCalendar(); // Get loading and error states
  const [displayedDate, setDisplayedDate] = useState(new Date()); // State for displayed date

  const today = new Date(); // Keep track of actual today

  // Format the displayed date for header and filtering
  const formattedDisplayedDate = useMemo(
    () =>
      displayedDate.toLocaleDateString("en-US", {
        weekday: "long",
        // year: "numeric", // Keep header concise
        month: "long",
        day: "numeric",
      }),
    [displayedDate]
  );
  const displayedDateString = useMemo(
    () => format(displayedDate, "yyyy-MM-dd"),
    [displayedDate]
  );

  // --- Event Filtering Logic ---

  // Removed sample event data
  // Removed time parsing helper function

  // Memoize and sort filtered events for the displayed date
  const displayedEvents = useMemo(() => {
    return events
      .filter((event) => event.date === displayedDateString) // Filter by displayed date
      .sort((a, b) => {
        // Sort all-day events first, then by start time
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;
        // If both are all-day or both have times, sort by title (or keep original order)
        if ((a.isAllDay && b.isAllDay) || (!a.startTime && !b.startTime)) {
          return a.title.localeCompare(b.title);
        }
        // Sort by start time if available
        return (a.startTime ?? "").localeCompare(b.startTime ?? "");
      });
  }, [events, displayedDateString]); // Depend on events and displayed date string

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

  // Separate all-day and timed events for the displayed date
  const allDayEvents = useMemo(
    () => displayedEvents.filter((event) => event.isAllDay),
    [displayedEvents]
  );
  const timedEvents = useMemo(
    () => displayedEvents.filter((event) => !event.isAllDay),
    [displayedEvents]
  );

  // --- Navigation Logic ---
  const minDate = useMemo(() => subDays(today, 7), [today]);
  const maxDate = useMemo(() => addDays(today, 30), [today]);

  const canGoPrevious = useMemo(
    () => displayedDate > minDate,
    [displayedDate, minDate]
  );
  const canGoNext = useMemo(
    () => displayedDate < maxDate,
    [displayedDate, maxDate]
  );

  const handlePreviousDay = () => {
    if (canGoPrevious) {
      setDisplayedDate((prevDate) => subDays(prevDate, 1));
    }
  };

  const handleNextDay = () => {
    if (canGoNext) {
      setDisplayedDate((prevDate) => addDays(prevDate, 1));
    }
  };

  const handleGoToToday = () => {
    setDisplayedDate(today);
  };

  // Reusable Event Item Component - Updated
  const EventItem = ({ event }: { event: ContextCalendarItem }) => {
    // Use ContextCalendarItem type
    const displayTime = event.isAllDay ? "All-day" : event.startTime ?? ""; // Show start time if not all-day, else empty string

    return (
      <li className="flex items-center gap-2 py-0.5 rounded hover:bg-gray-100">
        {/* Time */}
        <span className="text-xs font-mono w-14 text-right text-gray-500 flex-shrink-0">
          {displayTime}
        </span>
        {/* Color Dot */}
        <div
          className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getColorClassForEvent(
            event.title
          )}`}
        ></div>
        {/* Title */}
        <span className="flex-1 text-sm truncate text-gray-800">
          {event.title}
        </span>
      </li>
    );
  };

  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-300">
      {/* Header - Add Navigation */}
      <div className="p-2 border-b border-gray-700 flex-shrink-0 flex items-center justify-between gap-1">
        {/* Previous Day Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handlePreviousDay}
          disabled={!canGoPrevious}
          aria-label="Previous day"
        >
          <ChevronLeft size={16} />
        </Button>

        {/* Date Display & Today Button */}
        <div className="flex items-center justify-center flex-grow gap-2">
          <p className="text-xs font-medium text-gray-300 text-center">
            {formattedDisplayedDate}
          </p>
          {!isToday(displayedDate) && (
            <Button
              variant="outline"
              size="sm"
              className="h-5 px-1.5 text-xs"
              onClick={handleGoToToday}
            >
              Today
            </Button>
          )}
        </div>

        {/* Next Day Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleNextDay}
          disabled={!canGoNext}
          aria-label="Next day"
        >
          <ChevronRight size={16} />
        </Button>
      </div>

      {/* Loading Bar - Always rendered, animation controlled by isLoading */}
      <LoadingBar
        isLoading={isLoading}
        colorClassName="bg-orange-500"
        className="flex-shrink-0"
      />

      {/* Event List Area - Uses displayedEvents */}
      <div className="flex-1 overflow-y-auto py-2 space-y-2 relative">
        {/* Render All-day events - Add horizontal padding here */}
        {allDayEvents.length > 0 && (
          <ul className="space-y-1 px-2">
            {allDayEvents.map((event) => (
              <EventItem key={`allday-${event.id}`} event={event} />
            ))}
          </ul>
        )}
        {/* Separator - Now spans full width */}
        {allDayEvents.length > 0 && timedEvents.length > 0 && (
          <hr className="border-gray-700 my-2" />
        )}
        {/* Render Timed events - Add horizontal padding here */}
        {timedEvents.length > 0 && (
          <ul className="space-y-1 px-2">
            {timedEvents.map((event) => (
              <EventItem key={`timed-${event.id}`} event={event} />
            ))}
          </ul>
        )}
        {/* Message if no events */}
        {!isLoading && !error && displayedEvents.length === 0 && (
          <p className="text-center text-sm text-gray-400 pt-4 px-2">
            No events scheduled for this day.
          </p>
        )}
        {/* Error State - Overlay */}
        {error && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50 p-2">
            <p className="text-xs text-red-400 text-center">Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
