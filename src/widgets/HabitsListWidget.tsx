import React, { useState } from "react";
import { useHabits, Habit } from "@/contexts/HabitsContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CheckCircle2,
  Circle,
  MinusCircle,
  PlusCircle,
  Loader2,
} from "lucide-react"; // Icons
import dayjs from "dayjs";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  } = useHabits();
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null); // Track loading state per habit

  const today = dayjs().format("YYYY-MM-DD");

  const handleRecordEntry = async (habit: Habit) => {
    setLoadingEntryId(habit.id);
    await recordHabitEntry(habit.id, today);
    setLoadingEntryId(null);
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
    <div className="p-4 h-full flex flex-col">
      <h2 className="text-lg font-semibold mb-3">Today's Habits</h2>
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
          <ul className="space-y-2">
            {habits.map((habit) => {
              const isCompleted = isOnceDailyCompleted(habit);
              const isDisabled = isCompleted && habit.log_type === "once_daily";
              const isLoading = loadingEntryId === habit.id;
              const multipleCount =
                habit.log_type === "multiple_daily"
                  ? getMultipleDailyCount(habit.id)
                  : 0;

              let Icon = Circle;
              let iconColor = "text-gray-500";
              let tooltipText = `Log "${habit.name}" for today`;

              if (habit.type === "positive") {
                if (isCompleted || multipleCount > 0) {
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  tooltipText =
                    habit.log_type === "once_daily"
                      ? `"${habit.name}" logged for today`
                      : `Logged ${multipleCount} times today`;
                } else {
                  Icon = PlusCircle;
                  iconColor = "text-blue-400";
                }
              } else {
                // Negative habit
                if (isCompleted) {
                  // Completed means avoided
                  Icon = CheckCircle2;
                  iconColor = "text-green-400";
                  tooltipText = `Avoided "${habit.name}" today`;
                } else {
                  Icon = MinusCircle; // Icon for avoiding
                  iconColor = "text-orange-400";
                  tooltipText = `Mark "${habit.name}" as avoided today`;
                }
              }

              if (isDisabled) {
                tooltipText = `"${habit.name}" already logged for today`;
              }
              if (isLoading) {
                tooltipText = `Logging "${habit.name}"...`;
              }

              return (
                <li
                  key={habit.id}
                  className="flex items-center justify-between p-2 pr-1 bg-gray-800/60 rounded-md"
                >
                  <span
                    className={cn(
                      "flex-1 mr-2",
                      isDisabled ? "text-gray-500 line-through" : ""
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
                            "h-8 w-8 rounded-full",
                            iconColor,
                            isDisabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:bg-gray-700"
                          )}
                          onClick={() =>
                            !isDisabled &&
                            !isLoading &&
                            handleRecordEntry(habit)
                          }
                          disabled={isDisabled || isLoading}
                        >
                          {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Icon size={18} />
                          )}
                          <span className="sr-only">{tooltipText}</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{tooltipText}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      )}
    </div>
  );
}
