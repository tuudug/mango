import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { useCalendarStore } from "@/stores/calendarStore"; // Import Zustand store
// CalendarItem type import removed as it's not used
import { AlertTriangle, CalendarDays, Link, Unlink, X } from "lucide-react";
import React, { useState } from "react";

interface CalendarDataSourceProps {
  onClose?: () => void;
}

export function CalendarDataSource({ onClose }: CalendarDataSourceProps) {
  // Use the new context functions, including connection status and actions
  const {
    events,
    isLoading,
    error,
    addManualEvent,
    deleteManualEvent,
    isGoogleConnected,
    connectGoogleCalendar,
    disconnectGoogleCalendar,
  } = useCalendarStore(); // Use Zustand store
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState("");
  // Removed nextSyncCountdown state
  // Removed timeAgo state

  // Removed the entire countdown timer useEffect hook

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
    <Card className="h-full flex flex-col shadow-lg border-l bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 border-gray-700">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-blue-400" />
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

      {/* Reverted: Added flex-1 and overflow-hidden back to CardContent */}
      <CardContent className="flex-1 p-4 space-y-6 overflow-hidden">
        {/* Reverted: Removed flex-1 from ScrollArea */}
        <ScrollArea className="h-full pr-3">
          {/* Google Calendar Connection Section */}
          <div className="space-y-2 border-b pb-4 border-gray-700">
            <h3 className="text-base font-medium">Google Calendar</h3>
            {isGoogleConnected ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-green-400 flex items-center gap-1">
                  <Link size={14} /> Connected
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGoogleCalendar}
                  disabled={isLoading}
                >
                  {isLoading ? "Disconnecting..." : "Disconnect"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  <Unlink size={14} /> Not Connected
                </p>
                <Button
                  variant="default"
                  size="sm"
                  onClick={connectGoogleCalendar}
                  disabled={isLoading}
                >
                  Connect
                </Button>
              </div>
            )}
          </div>

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
          {error && <p className="text-sm text-red-400">Error: {error}</p>}

          {/* Existing Events List */}
          <div className="space-y-3">
            <h3 className="text-base font-medium">Existing Events</h3>
            {isLoading && events.length === 0 && (
              <p className="text-sm text-gray-500">Loading events...</p>
            )}
            {!isLoading && events.length === 0 && !error && (
              <p className="text-sm text-gray-400 italic">
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
                      className="flex justify-between items-center p-2.5 bg-gray-700/50 rounded border border-gray-700 shadow-sm"
                    >
                      <span className="text-sm">
                        {/* Indicate source visually using sourceProvider */}
                        {event.sourceProvider === "manual" ? (
                          <span
                            title="Manual Entry"
                            className="inline-block w-2 h-2 mr-2 bg-blue-500 rounded-full"
                          ></span>
                        ) : (
                          <span
                            title={`Google Calendar (${event.sourceInstanceId})`}
                            className="inline-block w-2 h-2 mr-2 bg-green-500 rounded-full"
                          ></span>
                        )}
                        <strong>{event.date}:</strong> {event.title}
                      </span>
                      {/* Only allow deleting manual events */}
                      {event.sourceProvider === "manual" && (
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

          {/* Removed Sync Status Footer */}
          <div className="mt-6 p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">
                The Google OAuth app is currently in test mode. To connect with
                Google Calendar, your email address needs to be manually added
                to the allowed test users. Please contact me to have your email
                added to the application.
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
