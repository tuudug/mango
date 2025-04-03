import React, { useState } from "react";

interface GoalTrackerWidgetProps {
  id: string;
}

interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  unit: string;
  color: string;
}

export const GoalTrackerWidget: React.FC<GoalTrackerWidgetProps> = ({ id }) => {
  // Sample goals data
  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      name: "Read Books",
      target: 12,
      current: 5,
      unit: "books",
      color: "bg-blue-500",
    },
    {
      id: "2",
      name: "Save Money",
      target: 5000,
      current: 2750,
      unit: "dollars",
      color: "bg-green-500",
    },
    {
      id: "3",
      name: "Exercise",
      target: 150,
      current: 87,
      unit: "minutes/week",
      color: "bg-orange-500",
    },
    {
      id: "4",
      name: "Learn Spanish",
      target: 100,
      current: 32,
      unit: "lessons",
      color: "bg-purple-500",
    },
  ]);

  // Calculate progress percentage
  const calculateProgress = (current: number, target: number): number => {
    return Math.min(Math.round((current / target) * 100), 100);
  };

  // Increment progress
  const incrementProgress = (goalId: string) => {
    setGoals(
      goals.map((goal) => {
        if (goal.id === goalId) {
          const newCurrent = Math.min(goal.current + 1, goal.target);
          return { ...goal, current: newCurrent };
        }
        return goal;
      })
    );
  };

  // Decrement progress
  const decrementProgress = (goalId: string) => {
    setGoals(
      goals.map((goal) => {
        if (goal.id === goalId) {
          const newCurrent = Math.max(goal.current - 1, 0);
          return { ...goal, current: newCurrent };
        }
        return goal;
      })
    );
  };

  // Reset all goals (for demo)
  const resetGoals = () => {
    setGoals(
      goals.map((goal) => ({
        ...goal,
        current: Math.floor(Math.random() * (goal.target + 1)),
      }))
    );
  };

  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-100 text-base">Goal Tracker</h3>
        <button
          onClick={resetGoals}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors px-1.5 py-0.5 rounded hover:bg-gray-700"
        >
          Randomize
        </button>
      </div>
      {/* Goals list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {goals.map((goal) => {
          const progress = calculateProgress(goal.current, goal.target);
          return (
            <div key={goal.id} className="space-y-0.5">
              <div className="flex justify-between items-center">
                <div className="text-sm font-medium text-gray-100">
                  {goal.name}
                </div>
                <div className="text-xs text-gray-400">
                  {goal.current} / {goal.target} {goal.unit}
                </div>
              </div>
              {/* Progress bar */}
              <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full ${goal.color} transition-all duration-500 ease-out`}
                  style={{ width: `${progress}%` }}
                ></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                    {progress}%
                  </span>
                </div>
              </div>
              {/* Controls */}
              <div className="flex justify-end space-x-1.5">
                <button
                  onClick={() => decrementProgress(goal.id)}
                  className="text-xs px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors text-gray-200 disabled:opacity-50"
                  disabled={goal.current <= 0}
                >
                  -
                </button>
                <button
                  onClick={() => incrementProgress(goal.id)}
                  className="text-xs px-1.5 py-0.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors text-gray-200 disabled:opacity-50"
                  disabled={goal.current >= goal.target}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Summary */}
      <div className="mt-2 pt-2 border-t border-gray-700">
        <div className="text-xs text-gray-400 flex justify-between">
          <span>
            {
              goals.filter(
                (g) => calculateProgress(g.current, g.target) === 100
              ).length
            }{" "}
            of {goals.length} goals completed
          </span>
          <span>
            Avg:{" "}
            {Math.round(
              goals.reduce(
                (sum, goal) =>
                  sum + calculateProgress(goal.current, goal.target),
                0
              ) / goals.length
            )}
            % complete
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-500 text-right">
        Widget ID: {id.slice(0, 8)}
      </div>
    </div>
  );
};
