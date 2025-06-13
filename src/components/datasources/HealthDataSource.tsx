import { Button } from "@/components/ui/button"; // Keep one Button import
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Import Label
import { ScrollArea } from "@/components/ui/scroll-area";
import { HealthSettings, useHealthStore } from "@/stores/healthStore"; // Import from Zustand store
import { format } from "date-fns"; // For relative time, ADD format
import {
  AlertTriangle,
  HeartPulse,
  Link,
  Scale,
  Trash2,
  Unlink,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react"; // Import useEffect

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
    // Removed lastFetchTime import
    healthSettings, // Get settings
    updateHealthSettings, // Get update function
  } = useHealthStore(); // Use Zustand store
  const [newSteps, setNewSteps] = useState("");
  // Remove newStepsDate state
  const [newWeight, setNewWeight] = useState(""); // State for new weight value
  // Remove newWeightDate state
  // Removed timeAgo state
  const [stepsGoalInput, setStepsGoalInput] = useState<string>(""); // State for steps goal input
  const [weightGoalInput, setWeightGoalInput] = useState<string>(""); // State for weight goal input

  // Removed the entire relative time display useEffect hook

  // Effect to initialize/update goal inputs when settings load/change
  useEffect(() => {
    if (healthSettings) {
      setStepsGoalInput(String(healthSettings.daily_steps_goal));
      // Handle null weight goal, display empty string if null
      setWeightGoalInput(
        healthSettings.weight_goal !== null
          ? String(healthSettings.weight_goal)
          : ""
      );
    } else {
      setStepsGoalInput(""); // Clear if settings are null/loading
      setWeightGoalInput("");
    }
  }, [healthSettings]);

  // Make the handler async
  const handleAddSteps = async (e: React.FormEvent) => {
    e.preventDefault();
    const stepsNumber = parseInt(newSteps, 10);
    const currentDate = format(new Date(), "yyyy-MM-dd"); // Get current date

    // Remove date check, use currentDate
    if (!isNaN(stepsNumber) && stepsNumber >= 0) {
      await addManualHealthEntry({
        entry_date: currentDate, // Use current date
        type: "steps",
        value: stepsNumber,
      });
      setNewSteps("");
      // Remove setNewStepsDate call
    } else {
      alert("Please enter a non-negative number for steps."); // Updated alert message
    }
  };

  // Handler for adding weight entry
  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNumber = parseFloat(newWeight);
    const currentDate = format(new Date(), "yyyy-MM-dd"); // Get current date

    // Remove date check, use currentDate
    if (!isNaN(weightNumber) && weightNumber > 0) {
      await addManualHealthEntry({
        entry_date: currentDate, // Use current date
        type: "weight",
        value: weightNumber,
      });
      setNewWeight("");
      // Remove setNewWeightDate call
    } else {
      alert("Please enter a positive number for weight."); // Updated alert message
    }
  };

  // Delete handler using the context function
  const handleDeleteEntry = async (entryId: string) => {
    // Optional: Add confirmation dialog here
    console.log(`Requesting delete for manual health entry: ${entryId}`);
    await deleteManualHealthEntry(entryId);
  };

  // Handler for saving goals (both steps and weight)
  const handleSaveGoals = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedStepsGoal = parseInt(stepsGoalInput, 10);
    // Allow empty string for weight goal, parse as null
    const parsedWeightGoal =
      weightGoalInput === "" ? null : parseFloat(weightGoalInput);

    // Validate steps goal
    if (isNaN(parsedStepsGoal) || parsedStepsGoal < 0) {
      alert("Please enter a valid non-negative integer for the steps goal.");
      return;
    }
    // Validate weight goal (must be null or positive number)
    if (
      parsedWeightGoal !== null &&
      (isNaN(parsedWeightGoal) || parsedWeightGoal <= 0)
    ) {
      alert(
        "Please enter a valid positive number for the weight goal, or leave it empty."
      );
      return;
    }

    // Construct the settings object
    const settingsToUpdate: HealthSettings = {
      daily_steps_goal: parsedStepsGoal,
      weight_goal: parsedWeightGoal,
    };

    await updateHealthSettings(settingsToUpdate);
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

          {/* Settings Section */}
          <form
            onSubmit={handleSaveGoals} // Use updated handler
            className="space-y-4 border-b pb-4 border-gray-700" // Increased spacing
          >
            <h3 className="text-base font-medium">Settings</h3>
            {/* Steps Goal Input */}
            <div className="flex items-end gap-3">
              <div className="flex-grow space-y-1.5">
                <Label htmlFor="steps-goal" className="text-xs text-gray-400">
                  Daily Steps Goal
                </Label>
                <Input
                  id="steps-goal"
                  type="number"
                  placeholder="e.g., 10000"
                  value={stepsGoalInput}
                  onChange={(e) => setStepsGoalInput(e.target.value)}
                  required
                  min="0"
                  className="p-2 h-9"
                  disabled={isLoading || !healthSettings}
                />
              </div>
              {/* Placeholder to align button */}
              <div className="w-[80px]"></div>
            </div>
            {/* Weight Goal Input */}
            <div className="flex items-end gap-3">
              <div className="flex-grow space-y-1.5">
                <Label htmlFor="weight-goal" className="text-xs text-gray-400">
                  Weight Goal (kg)
                </Label>
                <Input
                  id="weight-goal"
                  type="number"
                  placeholder="e.g., 75.0 (optional)"
                  value={weightGoalInput}
                  onChange={(e) => setWeightGoalInput(e.target.value)}
                  min="0"
                  step="0.1" // Allow decimals
                  className="p-2 h-9"
                  disabled={isLoading || !healthSettings}
                />
              </div>
              {/* Save Button - spans both inputs conceptually */}
              <Button
                type="submit"
                size="sm"
                className="h-9 w-[80px]" // Fixed width for button
                disabled={
                  isLoading ||
                  !healthSettings ||
                  // Disable if BOTH goals are unchanged
                  (stepsGoalInput ===
                    String(healthSettings?.daily_steps_goal ?? "") &&
                    weightGoalInput ===
                      (healthSettings?.weight_goal !== null
                        ? String(healthSettings?.weight_goal)
                        : ""))
                }
              >
                {isLoading ? "Saving..." : "Save Goals"}
              </Button>
            </div>
          </form>

          {/* Add Manual Step Entry Form */}
          <form onSubmit={handleAddSteps} className="space-y-3 pt-4">
            {" "}
            {/* Added padding top */}
            <h3 className="text-base font-medium">
              Add Manual Step Entry (Today)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Remove Date Input */}
              <Input
                type="number"
                placeholder="Steps Count for Today" // Update placeholder
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

          {/* Add Manual Weight Entry Form */}
          <form onSubmit={handleAddWeight} className="space-y-3 pt-4">
            <h3 className="text-base font-medium">
              Add Manual Weight Entry (Today)
            </h3>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Remove Date Input */}
              <Input
                type="number"
                placeholder="Weight (kg) for Today" // Update placeholder
                value={newWeight}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setNewWeight(e.target.value)
                }
                required
                min="0"
                step="0.1" // Allow decimals
                className="flex-grow p-2"
                disabled={isLoading}
              />
              <Button type="submit" size="sm" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Weight"}
              </Button>
            </div>
          </form>

          {/* Display Error if any */}
          {error && <p className="text-sm text-red-400">Error: {error}</p>}

          {/* Recorded Health Data List */}
          <div className="space-y-3 pt-4">
            {" "}
            {/* Added padding top */}
            <h3 className="text-base font-medium">Recorded Health Data</h3>
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
                {healthData // No need to filter, display all types
                  .sort((a, b) => b.entry_date.localeCompare(a.entry_date)) // Sort by date descending
                  .map((entry) => (
                    <li
                      key={entry.id} // Use entry ID from backend
                      className="flex justify-between items-center p-2.5 bg-gray-700/50 rounded border border-gray-700 shadow-sm gap-2"
                    >
                      <span className="text-sm flex items-center gap-1.5 flex-grow">
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
                        {/* Icon based on type */}
                        {entry.type === "steps" ? (
                          <HeartPulse
                            size={14}
                            className="text-red-400 flex-shrink-0"
                          />
                        ) : entry.type === "weight" ? (
                          <Scale
                            size={14}
                            className="text-purple-400 flex-shrink-0"
                          />
                        ) : null}
                        <strong>{entry.entry_date}:</strong>{" "}
                        <span className="truncate">
                          {entry.type === "steps"
                            ? `${entry.value.toLocaleString()} steps`
                            : entry.type === "weight"
                            ? `${entry.value.toFixed(1)} kg` // Display weight with 1 decimal place
                            : `${entry.value}`}
                        </span>{" "}
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

          {/* Removed Sync Status Footer */}

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
