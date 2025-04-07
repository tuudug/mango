import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card"; // Added Card import
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Habit, useHabits } from "@/contexts/HabitsContext";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  CheckCircle2,
  Circle,
  Loader2,
  MinusCircle,
  PlusCircle,
} from "lucide-react"; // Icons
import { useState } from "react";

// Define the props your widget expects (must include id, w, h)
interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

export function HabitsListWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const {
    habits,
    isLoadingHabits,
    recordHabitEntry,
    hasEntryForDate,
    getEntriesForDate,
    uncheckOnceDailyHabit, // Destructure the new function
  } = useHabits();
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null); // Track loading state per habit

  const today = dayjs().format("YYYY-MM-DD");

  // Combined handler for checking and unchecking
  const handleToggleHabit = async (habit: Habit) => {
    setLoadingEntryId(habit.id);
    try {
      if (habit.log_type === "once_daily" && isOnceDailyCompleted(habit)) {
        // Uncheck if it's once_daily and already completed
        await uncheckOnceDailyHabit(habit.id, today);
      } else {
        // Otherwise, record a new entry (handles both first check for once_daily and all checks for multiple_daily)
        await recordHabitEntry(habit.id, today);
      }
    } catch (error) {
      // Error handling is done in the context, but could add specific widget feedback here if needed
      console.error("Error toggling habit entry in widget:", error);
    } finally {
      setLoadingEntryId(null);
    }
  };

  // Determine if a 'once_daily' habit is already completed today
  const isOnceDailyCompleted = (habit: Habit): boolean => {
    return habit.log_type === "once_daily" && hasEntryForDate(habit.id, today);
  };

  // Get count for 'multiple_daily' habits today
  const getMultipleDailyCount = (habitId: string): number => {
    return getEntriesForDate(today).filter((e) => e.habit_id === habitId)
      .length;
  };

  return (
    <div className="p-2 h-full flex flex-col">
      {" "}
      {/* Reduced padding */}
      {/* Removed h2 title */}
      {isLoadingHabits && (
        <p className="text-center text-gray-400 mt-4">Loading habits...</p>
      )}
      {!isLoadingHabits && habits.length === 0 && (
        <p className="text-center text-gray-500 mt-4">
          No habits defined. Add some via the Habits panel.
        </p>
      )}
      {!isLoadingHabits && habits.length > 0 && (
        <ScrollArea className="flex-1 pr-3 -mr-3">
          {" "}
          {/* Offset padding for scrollbar */}
          <ul className="space-y-1.5">
            {" "}
            {/* Reduced spacing */}
            {habits.map((habit) => {
              const isCompleted = isOnceDailyCompleted(habit);
              const isLoading = loadingEntryId === habit.id;
              const multipleCount =
                habit.log_type === "multiple_daily"
                  ? getMultipleDailyCount(habit.id)
                  : 0;

              let Icon = Circle;
              let iconColor = "text-gray-500";
              let tooltipText = ""; // Initialize tooltip text

              if (habit.type === "positive") {
                if (isCompleted || multipleCount > 0) {
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  if (habit.log_type === "once_daily") {
                    tooltipText = `Uncheck "${habit.name}" for today`; // Changed tooltip for completed once_daily
                  } else {
                    tooltipText = `Logged ${multipleCount} times today`;
                  }
                  // Removed erroneous line 114
                } else {
                  Icon = PlusCircle;
                  iconColor = "text-blue-400";
                  tooltipText = `Log "${habit.name}" for today`; // Tooltip for logging positive
                }
              } else {
                // Negative habit
                if (isCompleted) {
                  // Completed means avoided
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  // Negative habits are only 'once_daily' check/uncheck
                  tooltipText = `Unmark "${habit.name}" as avoided today`; // Tooltip for unchecking negative
                } else {
                  Icon = MinusCircle; // Icon for avoiding
                  iconColor = "text-orange-400";
                  tooltipText = `Mark "${habit.name}" as avoided today`; // Tooltip for checking negative
                }
              }

              // isDisabled check is removed from tooltip logic as it's handled by the toggle function now
              if (isLoading) {
                tooltipText = `Logging "${habit.name}"...`;
              }

              // Re-applying the return block cleanly
              return (
                <li key={habit.id}>
                  <Card className="p-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex-1 mr-2 text-sm",
                          habit.log_type === "once_daily" && isCompleted
                            ? "text-gray-400"
                            : "" // Don't line-through, just dim slightly if completed
                        )}
                      >
                        {habit.name}
                        {multipleCount > 0 && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({multipleCount})
                          </span>
                        )}
                      </span>
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 rounded-full",
                                iconColor,
                                // Only disable based on loading state now
                                isLoading
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-gray-700"
                              )}
                              onClick={() =>
                                !isLoading && handleToggleHabit(habit)
                              } // Call the new toggle handler
                              disabled={isLoading} // Only disable when loading
                            >
                              {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Icon size={14} />
                              )}
                              <span className="sr-only">{tooltipText}</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            <p>{tooltipText}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </Card>
                </li>
              ); // End of return statement
            })}{" "}
            {/* End of map function */}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
