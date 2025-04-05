import React from "react";
import { useHabits, Habit } from "@/contexts/HabitsContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added Description
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Use RadioGroup for single selection
import { Label } from "@/components/ui/label";
import { Loader2, Check } from "lucide-react"; // Import Check icon
import { cn } from "@/lib/utils"; // Import cn for conditional classes

interface HabitSelectionModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectHabit: (habitId: string) => void;
  currentHabitId?: string | null; // Optional ID of the currently selected habit
  widgetType: string; // To display in the title, e.g., "Habit Heatmap"
}

export function HabitSelectionModal({
  isOpen,
  onOpenChange,
  onSelectHabit,
  currentHabitId,
  widgetType,
}: HabitSelectionModalProps) {
  const { habits, isLoadingHabits } = useHabits();
  // Use currentHabitId as the initial state if available
  const [selectedValue, setSelectedValue] = React.useState<string | undefined>(
    currentHabitId ?? undefined
  );

  // Update selected value if modal re-opens with a different currentHabitId
  React.useEffect(() => {
    if (isOpen) {
      setSelectedValue(currentHabitId ?? undefined);
    }
  }, [currentHabitId, isOpen]);

  const handleSave = () => {
    if (selectedValue) {
      onSelectHabit(selectedValue);
      onOpenChange(false); // Close modal on save
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-200">
        <DialogHeader>
          <DialogTitle>Configure {widgetType}</DialogTitle>
          <DialogDescription>
            Select the habit you want this widget to display data for.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 max-h-[60vh] overflow-hidden">
          {" "}
          {/* Limit height */}
          {isLoadingHabits ? (
            <div className="flex items-center justify-center text-gray-400">
              <Loader2 className="animate-spin mr-2" size={16} /> Loading
              habits...
            </div>
          ) : habits.length === 0 ? (
            <p className="text-center text-gray-500">
              No habits found. Please add habits first.
            </p>
          ) : (
            <ScrollArea className="h-full pr-3">
              {" "}
              {/* Scroll for long lists */}
              <RadioGroup
                value={selectedValue}
                onValueChange={setSelectedValue}
                className="grid gap-3"
              >
                {habits.map((habit) => {
                  const isSelected = selectedValue === habit.id;
                  return (
                    <Label
                      key={habit.id}
                      htmlFor={habit.id}
                      className={cn(
                        "flex items-center justify-between space-x-3 p-3 rounded-md border border-gray-700 bg-gray-900/30 hover:bg-gray-700/50 cursor-pointer transition-colors",
                        isSelected &&
                          "border-blue-500 bg-gray-700 ring-1 ring-blue-500" // Highlight selected
                      )}
                    >
                      <span className="font-medium flex-1 truncate">
                        {habit.name}
                      </span>
                      {/* Visually hide the default radio button, use Check icon instead */}
                      <RadioGroupItem
                        value={habit.id}
                        id={habit.id}
                        className="sr-only"
                      />
                      {isSelected && (
                        <Check className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                    </Label>
                  );
                })}
              </RadioGroup>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={
              !selectedValue ||
              isLoadingHabits ||
              selectedValue === currentHabitId
            } // Disable if no change
          >
            Save Selection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
