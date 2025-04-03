import React, { useState } from "react"; // Removed useEffect import

interface HabitGraphWidgetProps {
  id: string;
}

interface Habit {
  id: string;
  name: string;
  completedDays: Record<string, boolean>;
}

// Format date as YYYY-MM-DD - Moved outside component
const formatDate = (date: Date): string => {
  return date.toISOString().split("T")[0];
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const HabitGraphWidget: React.FC<HabitGraphWidgetProps> = ({
  id: _id, // Keep the prefix, ESLint disable handles the warning
}) => {
  // Prefix unused id
  // Use widget ID as part of localStorage key for persistence
  // const storageKey = `habit-widget-${id}`; // Removed storage key

  // Initialize habits with default values only
  const [habits, setHabits] = useState<Habit[]>(() => {
    // Removed localStorage loading

    // Generate some default habits with random completion data
    const defaultHabits: Habit[] = [
      { id: "1", name: "Exercise", completedDays: {} },
      { id: "2", name: "Meditation", completedDays: {} },
      { id: "3", name: "Reading", completedDays: {} },
    ];

    // Generate some random completion data for the past 14 days
    // Need formatDate defined before this point, so moved it outside component
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = formatDate(date); // Use the function defined outside

      defaultHabits.forEach((habit) => {
        // 70% chance of completing the habit on any given day
        habit.completedDays[dateStr] = Math.random() < 0.7;
      });
    }

    return defaultHabits;
  });

  const [newHabitName, setNewHabitName] = useState("");
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(
    habits.length > 0 ? habits[0].id : null
  );

  // Removed useEffect hook for saving to localStorage

  // Get dates for the last 7 days
  const getLast7Days = (): string[] => {
    const dates: string[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push(formatDate(date)); // Use the function defined outside
    }

    return dates;
  };

  // Get day name (e.g., "Mon") from date string
  const getDayName = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short" });
  };

  // Toggle habit completion for a specific date
  const toggleHabitCompletion = (habitId: string, dateStr: string) => {
    setHabits((prevHabits) =>
      prevHabits.map((habit) => {
        if (habit.id === habitId) {
          return {
            ...habit,
            completedDays: {
              ...habit.completedDays,
              [dateStr]: !habit.completedDays[dateStr],
            },
          };
        }
        return habit;
      })
    );
  };

  // Add a new habit
  const addHabit = () => {
    if (newHabitName.trim() === "") return;

    const newHabit: Habit = {
      id: Date.now().toString(),
      name: newHabitName,
      completedDays: {},
    };

    setHabits([...habits, newHabit]);
    setNewHabitName("");
    setSelectedHabitId(newHabit.id);
  };

  // Delete a habit
  const deleteHabit = (habitId: string) => {
    setHabits(habits.filter((habit) => habit.id !== habitId));
    if (selectedHabitId === habitId) {
      setSelectedHabitId(habits.length > 1 ? habits[0].id : null);
    }
  };

  // Calculate completion rate for a habit
  const calculateCompletionRate = (habit: Habit): number => {
    const last7Days = getLast7Days();
    let completedCount = 0;

    last7Days.forEach((date) => {
      if (habit.completedDays[date]) {
        completedCount++;
      }
    });

    return Math.round((completedCount / 7) * 100);
  };

  // Get the selected habit
  const selectedHabit = habits.find((h) => h.id === selectedHabitId) || null;
  const last7Days = getLast7Days();

  return (
    <div className="p-2 h-full w-full flex flex-col text-sm text-gray-300">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-semibold text-gray-100 text-base">Habit Tracker</h3>
        <div className="text-xs text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">
          Last 7 Days
        </div>
      </div>
      {/* Habit selector */}
      <div className="flex mb-2 space-x-1.5 overflow-x-auto pb-1">
        {habits.map((habit) => (
          <button
            key={habit.id}
            onClick={() => setSelectedHabitId(habit.id)}
            className={`px-3 py-1.5 text-xs rounded-full whitespace-nowrap transition-colors ${
              selectedHabitId === habit.id
                ? "bg-green-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            {habit.name}
          </button>
        ))}
      </div>
      {/* Calendar view */}
      {selectedHabit && (
        <div className="mb-2">
          <div className="flex justify-between items-center mb-1.5">
            <h4 className="text-sm font-medium text-gray-200">
              {selectedHabit.name}
            </h4>
            <span className="text-xs text-gray-400">
              {calculateCompletionRate(selectedHabit)}% completed
            </span>
          </div>
          <div className="grid grid-cols-7 gap-0.5">
            {last7Days.map((date) => (
              <div key={date} className="flex flex-col items-center">
                <div className="text-xs text-gray-400 mb-0.5">
                  {getDayName(date)}
                </div>
                <button
                  onClick={() => toggleHabitCompletion(selectedHabit.id, date)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                    selectedHabit.completedDays[date]
                      ? "bg-green-600 text-white"
                      : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                  }`}
                >
                  {selectedHabit.completedDays[date] ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : null}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Add new habit */}
      <div className="mt-auto pt-2 border-t border-gray-700">
        <div className="flex mb-1.5">
          <input
            type="text"
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && addHabit()}
            placeholder="New habit..."
            className="flex-1 px-2 py-1 text-sm border border-gray-600 rounded-l-md focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 bg-gray-800 text-gray-100 placeholder-gray-500"
          />
          <button
            onClick={addHabit}
            className="px-2 py-1 bg-green-600 text-white text-sm rounded-r-md hover:bg-green-700 transition-colors"
          >
            Add
          </button>
        </div>
        {selectedHabit && (
          <button
            onClick={() => deleteHabit(selectedHabit.id)}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Delete &ldquo;{selectedHabit.name}&rdquo;
          </button>
        )}
      </div>
      <div className="mt-2 text-xs text-gray-500 text-right">
        {/* Widget ID: {id.slice(0, 8)} */}{" "}
        {/* Commented out as id is unused */}
      </div>
    </div>
  );
};
