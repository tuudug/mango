import React, { useState } from "react"; // Import useState
import { useHabits, Habit } from "@/contexts/HabitsContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, ListChecks, PlusCircle, Edit, Trash2, Loader2 } from "lucide-react"; // Added Loader2
import { Badge } from "@/components/ui/badge";
import { HabitFormModal } from "./HabitFormModal"; // Import the modal
import { useToast } from "@/contexts/ToastContext"; // Import useToast for confirmation

// Define the type for the form data used by the modal
// Match the Zod schema output (reminder_time can be undefined)
type HabitFormData = {
  name: string;
  type: "positive" | "negative";
  log_type: "once_daily" | "multiple_daily";
  reminder_time?: string | null; // Changed to optional string | null
};

interface HabitsDataSourceProps {
  onClose?: () => void;
}

export function HabitsDataSource({ onClose }: HabitsDataSourceProps) {
  const { habits, isLoadingHabits, error, addHabit, updateHabit, deleteHabit } =
    useHabits();
  const { showToast } = useToast();

  // State for modal visibility and editing target
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null); // Track deleting state by habit ID

  const handleAddClick = () => {
    setEditingHabit(null); // Ensure we are in "add" mode
    setIsModalOpen(true);
  };

  const handleEditClick = (habit: Habit) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleDelete = async (habit: Habit) => {
    // Basic confirmation (replace with a proper dialog later if needed)
    if (
      !window.confirm(
        `Are you sure you want to delete the habit "${habit.name}"? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsDeleting(habit.id);
    const success = await deleteHabit(habit.id);
    setIsDeleting(null);
    if (success) {
      showToast({
        title: "Habit Deleted",
        description: `"${habit.name}" was removed.`,
      });
    }
    // Error toast is handled within the context
  };

  // The 'data' parameter here now correctly matches the expected type
  const handleFormSubmit = async (data: HabitFormData) => {
    let success = false;
    // Ensure undefined reminder_time becomes null for the API call
    const apiData = { ...data, reminder_time: data.reminder_time || null };

    if (editingHabit) {
      // Update existing habit
      const result = await updateHabit(editingHabit.id, apiData);
      success = !!result;
    } else {
      // Add new habit
      // Type assertion needed because addHabit expects non-optional fields from the DB schema perspective initially
      const result = await addHabit(
        apiData as Omit<Habit, "id" | "user_id" | "created_at" | "updated_at">
      );
      success = !!result;
    }

    if (success) {
      setIsModalOpen(false); // Close modal on success
      setEditingHabit(null); // Reset editing state
    }
    // Error toasts are handled within the context's add/update functions
  };

  return (
    <>
      <Card className="h-full flex flex-col shadow-lg border-l bg-gray-800 rounded-none">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 border-gray-700">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-green-400" /> {/* Icon */}
            <CardTitle className="text-lg font-semibold">Habits</CardTitle>
          </div>
          {/* Add Habit button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleAddClick}
            title="Add New Habit"
          >
            <PlusCircle size={16} />
            <span className="sr-only">Add Habit</span>
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 ml-auto" // Use ml-auto to push close button right
            >
              <X size={16} />
              <span className="sr-only">Close Panel</span>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 p-0 overflow-hidden">
          {" "}
          {/* Remove padding for full ScrollArea */}
          <ScrollArea className="h-full p-4">
            {" "}
            {/* Add padding inside ScrollArea */}
            {isLoadingHabits && (
              <p className="text-center text-gray-400">Loading habits...</p>
            )}
            {error && <p className="text-red-400 px-4 py-2">Error: {error}</p>}
            {!isLoadingHabits && habits.length === 0 && !error && (
              <p className="text-center text-gray-500 py-4">
                No habits defined yet. Click '+' to add one.
              </p>
            )}
            <ul className="space-y-3">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className="flex items-center justify-between p-3 bg-gray-700/50 rounded-md shadow"
                >
                  <div className="flex flex-col overflow-hidden mr-2">
                    {" "}
                    {/* Added overflow-hidden */}
                    <span className="font-medium truncate">
                      {habit.name}
                    </span>{" "}
                    {/* Added truncate */}
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {" "}
                      {/* Added flex-wrap */}
                      <Badge
                        variant={
                          habit.type === "positive" ? "default" : "destructive"
                        }
                        className="text-xs capitalize"
                      >
                        {habit.type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs capitalize">
                        {habit.log_type.replace("_", " ")}
                      </Badge>
                      {habit.reminder_time && (
                        <Badge variant="outline" className="text-xs">
                          Reminds @ {habit.reminder_time.substring(0, 5)}{" "}
                          {/* Show HH:MM */}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {" "}
                    {/* Added flex-shrink-0 */}
                    {/* Edit button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-white"
                      onClick={() => handleEditClick(habit)}
                      title="Edit Habit"
                    >
                      <Edit size={14} />
                      <span className="sr-only">Edit Habit</span>
                    </Button>
                    {/* Delete button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-400"
                      onClick={() => handleDelete(habit)}
                      disabled={isDeleting === habit.id} // Disable while deleting this specific habit
                      title="Delete Habit"
                    >
                      {isDeleting === habit.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                      <span className="sr-only">Delete Habit</span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Render the Modal */}
      <HabitFormModal
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSubmit={handleFormSubmit}
        initialData={editingHabit}
      />
    </>
  );
}
