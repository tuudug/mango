import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card"; // Import Shadcn Card components
import { Input } from "@/components/ui/input"; // Import Shadcn Input
import { useHealth } from "@/contexts/HealthContext";
import { HeartPulse, X } from "lucide-react"; // Import icons
import React, { useState } from "react";

// Define props including onClose
interface HealthDataSourceProps {
  onClose?: () => void; // Make onClose optional
}

export function HealthDataSource({ onClose }: HealthDataSourceProps) {
  const { stepData, addOrUpdateSteps } = useHealth();
  const [newSteps, setNewSteps] = useState("");
  const [newStepsDate, setNewStepsDate] = useState(""); // YYYY-MM-DD

  const handleAddSteps = (e: React.FormEvent) => {
    e.preventDefault();
    const stepsNumber = parseInt(newSteps, 10);
    if (!isNaN(stepsNumber) && newStepsDate && stepsNumber >= 0) {
      addOrUpdateSteps({ date: newStepsDate, steps: stepsNumber });
      setNewSteps("");
      setNewStepsDate("");
    } else {
      alert("Please enter a valid date and a non-negative number for steps.");
    }
  };

  return (
    // Use Card as the main container, match panel background, remove rounding
    <Card className="h-full flex flex-col shadow-lg border-l bg-white dark:bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 dark:border-gray-700">
        {" "}
        {/* Added dark border */}
        <div className="flex items-center gap-2">
          <HeartPulse className="w-5 h-5 text-red-500 dark:text-red-400" />
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Health Data
          </h2>
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

      <CardContent className="flex-1 p-4 overflow-y-auto space-y-6">
        {/* Add/Update Steps Form */}
        <form onSubmit={handleAddSteps} className="space-y-3">
          <h3 className="text-base font-medium">Add/Update Daily Steps</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="date"
              value={newStepsDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setNewStepsDate(e.target.value)
              }
              required
              className="p-2"
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
            />
            <Button type="submit" size="sm">
              Save Steps
            </Button>
          </div>
        </form>

        {/* Recorded Step Data List */}
        <div className="space-y-3">
          <h3 className="text-base font-medium">Recorded Step Data</h3>
          {stepData.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">
              No step data found.
            </p>
          ) : (
            <ul className="space-y-2">
              {stepData
                .sort((a, b) => b.date.localeCompare(a.date)) // Sort by date descending
                .map((entry) => (
                  <li
                    key={entry.date}
                    className="flex justify-between items-center p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded border border-gray-200 dark:border-gray-700 shadow-sm"
                  >
                    <span className="text-sm">
                      <strong>{entry.date}:</strong>{" "}
                      {entry.steps.toLocaleString()} steps
                    </span>
                    {/* No delete button */}
                  </li>
                ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
