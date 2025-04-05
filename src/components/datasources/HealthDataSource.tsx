import { Button } from "@/components/ui/button"; // Keep one Button import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area"; // Import ScrollArea
import { useHealth } from "@/contexts/HealthContext";
import {
  HeartPulse,
  X,
  Link,
  Unlink,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import React, { useState, useEffect } from "react"; // Import useEffect
import { formatDistanceToNow } from "date-fns"; // For relative time

// Define props including onClose
interface HealthDataSourceProps {
  onClose?: () => void; // Make onClose optional
}

export function HealthDataSource({ onClose }: HealthDataSourceProps) {
  // Use new context structure, including connection status and actions
  const {
    healthData,
    isLoading,
    error,
    addManualHealthEntry,
    deleteManualHealthEntry,
    isGoogleHealthConnected,
    connectGoogleHealth,
    disconnectGoogleHealth,
    lastFetchTime, // Get last fetch time
  } = useHealth();
  const [newSteps, setNewSteps] = useState("");
  const [newStepsDate, setNewStepsDate] = useState(""); // YYYY-MM-DD
  const [timeAgo, setTimeAgo] = useState<string>(""); // State for relative time display

  // Update relative time display periodically
  useEffect(() => {
    const updateDisplay = () => {
      if (lastFetchTime) {
        setTimeAgo(formatDistanceToNow(lastFetchTime, { addSuffix: true }));
      } else {
        setTimeAgo("");
      }
    };
    updateDisplay(); // Initial update
    const intervalId = setInterval(updateDisplay, 60000); // Update every minute
    return () => clearInterval(intervalId); // Cleanup interval
  }, [lastFetchTime]);

  // Make the handler async
  const handleAddSteps = async (e: React.FormEvent) => {
    e.preventDefault(); // Keep one preventDefault
    const stepsNumber = parseInt(newSteps, 10);
    if (!isNaN(stepsNumber) && newStepsDate && stepsNumber >= 0) {
      // Call the context function to add entry
      await addManualHealthEntry({
        entry_date: newStepsDate,
        type: "steps", // Hardcode type for now
        value: stepsNumber,
      });
      setNewSteps("");
      setNewStepsDate("");
    } else {
      alert("Please enter a valid date and a non-negative number for steps.");
    }
  };

  // Delete handler using the context function
  const handleDeleteEntry = async (entryId: string) => {
    // Optional: Add confirmation dialog here
    console.log(`Requesting delete for manual health entry: ${entryId}`);
    await deleteManualHealthEntry(entryId); // Call context function
  };

  return (
    // Use Card as the main container, match panel background, remove rounding
    <Card className="h-full flex flex-col shadow-lg border-l bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 border-gray-700">
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-red-400" />
          {/* Use CardTitle */}
          <CardTitle className="text-lg font-semibold">Health Data</CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
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
          {/* Google Health Connection Section */}
          <div className="space-y-2 border-b pb-4 border-gray-700">
            <h3 className="text-base font-medium">Google Health</h3>
            {isGoogleHealthConnected ? (
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-green-400 flex items-center gap-1">
                  <Link size={14} /> Connected
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectGoogleHealth}
                  disabled={isLoading} // Use context isLoading
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
                  onClick={connectGoogleHealth}
                  disabled={isLoading} // Use context isLoading
                >
                  Connect
                </Button>
              </div>
            )}
          </div>

          {/* Add/Update Steps Form */}
          <form onSubmit={handleAddSteps} className="space-y-3">
            <h3 className="text-base font-medium">Add Manual Step Entry</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                type="date"
                value={newStepsDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewStepsDate(e.target.value)
                }
                required
                className="p-2"
                disabled={isLoading} // Disable when loading
              />
              <Input
                type="number"
                placeholder="Steps Count"
                value={newSteps}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewSteps(e.target.value)
                }
                required
                min="0"
                className="flex-grow p-2"
                disabled={isLoading} // Disable when loading
              />
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Steps"}
              </Button>
            </div>
          </form>

          {/* Display Error if any */}
          {error && <p className="text-sm text-red-400">Error: {error}</p>}

          {/* Recorded Step Data List */}
          <div className="space-y-3">
            <h3 className="text-base font-medium">Recorded Step Data</h3>
            {isLoading && healthData.length === 0 && (
              <p className="text-sm text-gray-500">Loading data...</p>
            )}
            {!isLoading && healthData.length === 0 && !error && (
              <p className="text-sm text-gray-400 italic">
                No step data found. Add an entry above.
              </p>
            )}
            {healthData.length > 0 && (
              <ul className="space-y-2">
                {healthData
                  // Filter only step data for now
                  .filter((entry) => entry.type === "steps")
                  .sort((a, b) => b.entry_date.localeCompare(a.entry_date)) // Sort by date descending
                  .map((entry) => (
                    <li
                      key={entry.id} // Use entry ID from backend
                      className="flex justify-between items-center p-2.5 bg-gray-700/50 rounded border border-gray-700 shadow-sm gap-2" // Added gap
                    >
                      <span className="text-sm flex items-center gap-1.5 flex-grow">
                        {" "}
                        {/* Added flex-grow */}
                        {/* Source Indicator */}
                        {entry.sourceProvider === "manual" ? (
                          <span
                            title="Manual Entry"
                            className="inline-block w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"
                          ></span>
                        ) : (
                          <span
                            title="Google Health"
                            className="inline-block w-2 h-2 bg-green-500 rounded-full flex-shrink-0"
                          ></span>
                        )}
                        <strong>{entry.entry_date}:</strong>{" "}
                        <span className="truncate">
                          {entry.value.toLocaleString()} steps
                        </span>{" "}
                        {/* Added truncate */}
                      </span>
                      {/* Delete Button for Manual Entries */}
                      {entry.sourceProvider === "manual" && (
                        <Button
                          variant="ghost" // Use ghost for less emphasis
                          size="icon"
                          className="h-6 w-6 text-red-600 hover:bg-red-900/50 flex-shrink-0" // Make smaller, red on hover
                          onClick={() => handleDeleteEntry(entry.id)}
                          disabled={isLoading} // Disable while loading/saving
                          aria-label="Delete manual entry"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </li>
                  ))}
              </ul>
            )}
          </div>

          {/* Sync Status Footer */}
          <div className="mt-auto pt-2 border-t border-gray-700 text-center">
            {lastFetchTime ? (
              <p className="text-xs text-gray-400">Last synced: {timeAgo}</p>
            ) : isLoading ? (
              <p className="text-xs text-gray-400">Syncing...</p>
            ) : (
              <p className="text-xs text-gray-400">Not synced yet.</p>
            )}
            {/* Optionally add a manual refresh button */}
            {/* <Button variant="link" size="sm" onClick={fetchHealthDataIfNeeded} disabled={isLoading}>Refresh</Button> */}
          </div>

          {/* Warning card about client-side storage */}
          <div className="mt-6 p-3 bg-yellow-900/30 border border-yellow-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-300">
                The Google OAuth app is currently in test mode. To connect with
                Google Health, your email address needs to be manually added to
                the allowed test users. Please contact me to have your email
                added to the application.
              </p>
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
