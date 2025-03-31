import React, { useState } from "react";
import { useHealth } from "@/contexts/HealthContext";
import { Button } from "@/components/ui/button";

export function HealthDataSource() {
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
      // Basic validation feedback (could be improved)
      alert("Please enter a valid date and a non-negative number for steps.");
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 h-full overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-4">
        Health Data Source (Steps)
      </h2>

      <form
        onSubmit={handleAddSteps}
        className="mb-6 p-4 border rounded dark:border-gray-700"
      >
        <h3 className="text-lg font-medium mb-2">Add/Update Daily Steps</h3>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="date"
            value={newStepsDate}
            onChange={(e) => setNewStepsDate(e.target.value)}
            required
            className="p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          />
          <input
            type="number"
            placeholder="Steps Count"
            value={newSteps}
            onChange={(e) => setNewSteps(e.target.value)}
            required
            min="0"
            className="flex-grow p-2 border rounded bg-white dark:bg-gray-800 dark:border-gray-600"
          />
          <Button type="submit">Save Steps</Button>
        </div>
      </form>

      <div>
        <h3 className="text-lg font-medium mb-2">Recorded Step Data</h3>
        {stepData.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">
            No step data found.
          </p>
        ) : (
          <ul className="space-y-2">
            {stepData
              .sort((a, b) => b.date.localeCompare(a.date)) // Sort by date descending
              .map((entry) => (
                <li
                  key={entry.date} // Use date as key assuming one entry per date
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700"
                >
                  <span>
                    <strong>{entry.date}:</strong>{" "}
                    {entry.steps.toLocaleString()} steps
                  </span>
                  {/* No delete button for now, as per context design */}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}
