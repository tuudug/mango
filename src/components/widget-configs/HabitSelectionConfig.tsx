import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Habit, useHabitsStore } from "@/stores/habitsStore"; // Import from Zustand store
import { GridItem } from "@/lib/dashboardConfig"; // Import GridItem for config type
import { Loader2 } from "lucide-react";

interface HabitSelectionConfigProps {
  config: GridItem["config"]; // Current config { habitId?: string }
  onChange: (newConfig: GridItem["config"]) => void; // Callback to update temp config in modal
}

export function HabitSelectionConfig({
  config,
  onChange,
}: HabitSelectionConfigProps) {
  const { habits, isLoadingHabits } = useHabitsStore(); // Use Zustand store

  // Ensure selectedHabitId is always a string
  const selectedHabitId = config?.habitId || "";

  const handleValueChange = (value: string) => {
    console.log("Radio selection changed to:", value);
    onChange({ habitId: value });
  };

  if (isLoadingHabits) {
    return (
      <div className="flex items-center justify-center text-gray-400 py-4">
        <Loader2 className="animate-spin mr-2" size={18} /> Loading habits...
      </div>
    );
  }

  if (!habits || habits.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No habits found. Please add habits in the Habits data source panel
        first.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <Label className="text-gray-200">Select Habit to Display</Label>
      <ScrollArea className="h-[200px] border border-gray-700 rounded-md p-3 bg-gray-900">
        <div className="space-y-2">
          {habits.map((habit: Habit) => (
            <div key={habit.id} className="flex items-center space-x-2">
              <input
                type="radio"
                id={`habit-${habit.id}`}
                name="habit-selection"
                value={habit.id}
                checked={selectedHabitId === habit.id}
                onChange={() => handleValueChange(habit.id)}
                className="text-blue-500 border-gray-600 focus:ring-blue-500 h-4 w-4 rounded-full"
              />
              <Label
                htmlFor={`habit-${habit.id}`}
                className="font-normal text-gray-300 hover:text-gray-100 cursor-pointer"
              >
                {habit.name}
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
