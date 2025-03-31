import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import CardTitle
import { Input } from "@/components/ui/input";
import { useCalendar } from "@/contexts/CalendarContext";
import { CalendarDays, X } from "lucide-react";
import React, { useState } from "react";

interface CalendarDataSourceProps {
  onClose?: () => void;
}

export function CalendarDataSource({ onClose }: CalendarDataSourceProps) {
  // Use the new context functions
  const { events, isLoading, error, addManualEvent, deleteManualEvent } =
    useCalendar();
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");

  const handleAddEvent = async (e: React.FormEvent) => {
    // Make async
    e.preventDefault();
    if (newEventTitle && newEventDate) {
      await addManualEvent({ title: newEventTitle, date: newEventDate }); // Call new async function
      setNewEventTitle("");
      setNewEventDate("");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    // Make async
    await deleteManualEvent(eventId); // Call new async function
  };

  return (
    // Use Card as the main container, match panel background, remove rounding
    <Card className="h-full flex flex-col shadow-lg border-l bg-white dark:bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          {/* Use CardTitle for consistency */}
          <CardTitle className="text-lg font-semibold">Calendar Data</CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onClose}
          >
            <X size={16} />
            <span className="sr-only">Close Panel</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Add Event Form */}
        <form onSubmit={handleAddEvent} className="space-y-3">
          <h3 className="text-base font-medium">Add New Manual Event</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="date"
              value={newEventDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewEventDate(e.target.value)
              }
              required
              className="p-2"
              disabled={isLoading} // Disable input while loading
            />
            <Input
              type="text"
              placeholder="Event Title"
              value={newEventTitle}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewEventTitle(e.target.value)
              }
              required
              className="flex-grow p-2"
              disabled={isLoading} // Disable input while loading
            />
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Event"}
            </Button>
          </div>
        </form>

        {/* Display Error if any */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Error: {error}
          </p>
        )}

        {/* Existing Events List */}
        <div className="space-y-3">
          <h3 className="text-base font-medium">Existing Events</h3>
          {isLoading && events.length === 0 && (
            <p className="text-sm text-gray-500">Loading events...</p>
          )}
          {!isLoading && events.length === 0 && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No events found. Add one above or connect Google Calendar.
            </p>
          )}
          {events.length > 0 && (
            <ul className="space-y-2">
              {events
                .sort((a, b) => a.date.localeCompare(b.date)) // Consider sorting combined events later if needed
                .map((event) => (
                  <li
                    key={event.id} // Use event ID from backend/source
                    className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <span className="text-sm">
                      {/* Optionally indicate source */}
                      {event.sourceInstanceId !== "manual_calendar" && (
                        <span
                          title={event.sourceInstanceId}
                          className="text-xs mr-1"
                        >
                          {" "}
                          G{" "}
                        </span>
                      )}
                      <strong>{event.date}:</strong> {event.title}
                    </span>
                    {/* Only allow deleting manual events */}
                    {event.sourceInstanceId.startsWith("manual") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEvent(event.id)}
                        disabled={isLoading} // Disable button while loading
                      >
                        Delete
                      </Button>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
