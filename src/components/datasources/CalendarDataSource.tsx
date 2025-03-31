import React, { useState } from "react";
import { useCalendar } from "@/contexts/CalendarContext"; // Removed CalendarEvent import
import { Button } from "@/components/ui/button";

export function CalendarDataSource() {
  const { events, addEvent, deleteEvent } = useCalendar();
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(""); // YYYY-MM-DD

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (newEventTitle && newEventDate) {
      addEvent({ title: newEventTitle, date: newEventDate });
      setNewEventTitle("");
      setNewEventDate("");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">Calendar Data Source</h2>

      <form
        onSubmit={handleAddEvent}
        className="mb-6 p-4 border rounded dark:border-gray-700"
      >
        <h3 className="text-lg font-medium mb-2">Add New Event</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="date"
            value={newEventDate}
            onChange={(e) => setNewEventDate(e.target.value)}
            required
            className="p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          />
          <input
            type="text"
            placeholder="Event Title"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            required
            className="flex-grow p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          />
          <Button type="submit">Add Event</Button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-2">Existing Events</h3>
        {events.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No events found.</p>
        ) : (
          <ul className="space-y-2">
            {events
              .sort((a, b) => a.date.localeCompare(b.date)) // Sort by date
              .map((event) => (
                <li
                  key={event.id}
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700"
                >
                  <span>
                    <strong>{event.date}:</strong> {event.title}
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteEvent(event.id)}
                  >
                    Delete
                  </Button>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
