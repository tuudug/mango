import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Habit, useHabitsStore } from "@/stores/habitsStore"; // Import from Zustand store
import { calculateStreaks } from "@/lib/habitUtils";
import { cn } from "@/lib/utils";
import dayjs from "dayjs";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Medal,
  MinusCircle,
  PlusCircle,
  ThumbsDown, // Added
  ThumbsUp, // Added
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

interface StreakData {
  current: number;
  longest: number;
}

export function HabitsListWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const {
    habits,
    habitEntries,
    isLoadingHabits,
    isLoadingEntries,
    recordHabitEntry,
    hasEntryForDate,
    uncheckOnceDailyHabit,
  } = useHabitsStore(); // Use Zustand store
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);

  const today = dayjs().format("YYYY-MM-DD");

  // Calculate streaks for ALL habits outside the map loop
  const allHabitStreaks = useMemo(() => {
    const streaksMap = new Map<string, StreakData>();
    if (!habitEntries || !habits) {
      return streaksMap; // Return empty map if data isn't ready
    }

    habits.forEach((habit) => {
      const completedEntries = habitEntries.filter(
        (entry) => entry.habit_id === habit.id && entry.completed
      );
      // No need to sort here as calculateStreaks handles it
      streaksMap.set(habit.id, calculateStreaks(completedEntries));
    });

    return streaksMap;
  }, [habits, habitEntries]); // Recalculate streaks when habits or entries change

  // Calculate today's counts for ALL multiple_daily habits outside the map loop
  const multipleDailyCountsToday = useMemo(() => {
    const countsMap = new Map<string, number>();
    if (!habitEntries || !habits) {
      return countsMap;
    }

    habits.forEach((habit) => {
      if (habit.log_type === "multiple_daily") {
        const count = habitEntries.filter(
          (entry) =>
            entry.habit_id === habit.id &&
            entry.entry_date === today &&
            entry.completed
        ).length;
        countsMap.set(habit.id, count);
      }
    });
    return countsMap;
  }, [habits, habitEntries, today]); // Recalculate when habits, entries, or the date change

  const handleToggleHabit = async (habit: Habit) => {
    setLoadingEntryId(habit.id);
    try {
      if (habit.log_type === "once_daily" && isOnceDailyCompleted(habit)) {
        await uncheckOnceDailyHabit(habit.id, today);
      } else {
        await recordHabitEntry(habit.id, today);
      }
    } catch (error) {
      console.error("Error toggling habit entry in widget:", error);
    } finally {
      setLoadingEntryId(null);
    }
  };

  const isOnceDailyCompleted = (habit: Habit): boolean => {
    if (habitEntries) {
      return (
        habit.log_type === "once_daily" &&
        habitEntries.some(
          (e) =>
            e.habit_id === habit.id && e.entry_date === today && e.completed
        )
      );
    }
    return habit.log_type === "once_daily" && hasEntryForDate(habit.id, today);
  };

  // Removed getMultipleDailyCount function as it's replaced by the memoized map

  const isLoading = isLoadingHabits || isLoadingEntries;

  return (
    <div className="p-2 h-full flex flex-col">
      {isLoading && (
        <p className="text-center text-gray-400 mt-4">Loading data...</p>
      )}
      {!isLoading && habits.length === 0 && (
        <p className="text-center text-gray-500 mt-4">
          No habits defined. Add some via the Habits panel.
        </p>
      )}
      {!isLoading && habits.length > 0 && (
        <ScrollArea className="flex-1 pr-3 -mr-3">
          <ul className="space-y-1.5">
            {habits.map((habit) => {
              const isCompletedToday = isOnceDailyCompleted(habit);
              const isProcessing = loadingEntryId === habit.id;
              // Get pre-calculated count for today from the map
              const multipleCount = multipleDailyCountsToday.get(habit.id) ?? 0;

              // Get pre-calculated streaks from the map
              const streaks = allHabitStreaks.get(habit.id) ?? {
                current: 0,
                longest: 0,
              };

              let Icon = Circle;
              let iconColor = "text-gray-500";
              let tooltipText = "";

              // Corrected if/else structure
              if (habit.type === "positive") {
                if (isCompletedToday || multipleCount > 0) {
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  tooltipText =
                    habit.log_type === "once_daily"
                      ? `Uncheck "${habit.name}" for today`
                      : `Logged ${multipleCount} times today`;
                } else {
                  Icon = PlusCircle;
                  iconColor = "text-blue-400";
                  tooltipText = `Log "${habit.name}" for today`;
                }
              } else {
                // Negative habit
                if (isCompletedToday) {
                  // Completed means avoided
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  tooltipText = `Unmark "${habit.name}" as avoided today`;
                } else {
                  Icon = MinusCircle; // Icon for avoiding
                  iconColor = "text-orange-400";
                  tooltipText = `Mark "${habit.name}" as avoided today`;
                }
              }

              if (isProcessing) {
                tooltipText = `Logging "${habit.name}"...`;
              }

              return (
                <li key={habit.id}>
                  <Card
                    className={cn(
                      "p-1.5", // Base class
                      {
                        // Apply border based on streak tier ONLY for positive habits
                        "fiery-streak-border":
                          habit.type === "positive" && streaks.current >= 5,
                        "glowing-streak-border":
                          habit.type === "positive" &&
                          streaks.current >= 3 &&
                          streaks.current < 5,
                        "sparking-streak-border":
                          habit.type === "positive" &&
                          streaks.current >= 1 &&
                          streaks.current < 3,
                      }
                    )}
                  >
                    <div className="flex items-center">
                      {" "}
                      {/* Removed justify-between */}
                      {/* Habit Name */}
                      <span
                        className={cn(
                          "flex flex-1 items-center gap-1.5 mr-2 text-sm truncate", // Added flex, items-center, gap-1.5
                          habit.log_type === "once_daily" && isCompletedToday
                            ? "text-gray-400 line-through"
                            : ""
                        )}
                      >
                        {/* Habit Type Icon */}
                        {habit.type === "positive" ? (
                          <ThumbsUp
                            size={12}
                            className="text-green-500 flex-shrink-0"
                          />
                        ) : (
                          <ThumbsDown
                            size={12}
                            className="text-red-500 flex-shrink-0"
                          />
                        )}
                        {/* Habit Name Text (no extra span needed) */}
                        {habit.name}
                        {multipleCount > 0 && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({multipleCount} today) {/* Updated format */}
                          </span>
                        )}
                      </span>
                      {/* Streaks Display (Inline) */}
                      <div className="text-xs text-gray-400 flex items-center gap-1.5 mx-2 flex-shrink-0">
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-0.5 cursor-default">
                                <TrendingUp
                                  size={12} // Increased size
                                  className="text-blue-400"
                                />
                                {/* Added color */}
                                {streaks.current}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs p-1"
                            >
                              Current Streak
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <span className="text-gray-600">/</span>
                        <TooltipProvider delayDuration={150}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-0.5 cursor-default">
                                <Medal size={12} className="text-yellow-400" />{" "}
                                {/* Increased size */}
                                {streaks.longest}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="bottom"
                              className="text-xs p-1"
                            >
                              Longest Streak
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      {/* Right side: Action Button */}
                      <TooltipProvider delayDuration={150}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                "h-6 w-6 rounded-full flex-shrink-0",
                                iconColor,
                                isProcessing
                                  ? "opacity-50 cursor-not-allowed"
                                  : "hover:bg-gray-700"
                              )}
                              onClick={() =>
                                !isProcessing && handleToggleHabit(habit)
                              }
                              disabled={isProcessing}
                            >
                              {isProcessing ? (
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
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
