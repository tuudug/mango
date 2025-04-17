import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input"; // Restore Input import
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Checkbox } from "@/components/ui/checkbox"; // Import Checkbox
import { Habit } from "@/contexts/HabitsContext"; // Import Habit type
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import * as z from "zod";

// Zod schema for validation
const habitFormSchema = z.object({
  name: z.string().min(1, "Habit name is required"),
  type: z.enum(["positive", "negative"], {
    required_error: "Habit type is required",
  }),
  log_type: z.enum(["once_daily", "multiple_daily"], {
    required_error: "Log frequency is required",
  }),
  // Change reminder_time to be one of the specific 15-min interval strings
  reminder_time: z
    .string()
    .regex(
      /^([01]\d|2[0-3]):(00|15|30|45)$/,
      "Invalid time format (HH:MM, 15-min intervals)"
    )
    .optional()
    .nullable(),
  enable_notification: z.boolean().optional(), // Make optional, handle default in useForm
});

// Type will now have enable_notification as optional boolean
type HabitFormData = z.infer<typeof habitFormSchema>;

interface HabitFormModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: HabitFormData) => Promise<void>; // Make async for potential API calls
  initialData?: Habit | null; // Habit data for editing
}

export function HabitFormModal({
  isOpen,
  onOpenChange,
  onSubmit,
  initialData,
}: HabitFormModalProps) {
  const isEditing = !!initialData;
  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormData>({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      name: "",
      type: "positive",
      log_type: "once_daily",
      reminder_time: null,
      enable_notification: false, // Add default value
    },
  });

  // Reset form when initialData changes (for editing) or modal opens/closes
  useEffect(() => {
    if (isOpen) {
      if (isEditing && initialData) {
        reset({
          name: initialData.name,
          type: initialData.type,
          log_type: initialData.log_type,
          // Format time for input type="time" (HH:MM)
          reminder_time: initialData.reminder_time
            ? initialData.reminder_time.substring(0, 5)
            : null,
          // Use nullish coalescing for potentially undefined boolean from DB
          enable_notification: initialData.enable_notification ?? false,
        });
      } else {
        reset({
          // Reset to defaults for adding
          name: "",
          type: "positive",
          log_type: "once_daily",
          reminder_time: null,
          enable_notification: false, // Reset to default
        });
      }
    }
  }, [initialData, isEditing, reset, isOpen]);

  // Generate 15-minute interval options
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const totalMinutes = i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const formattedTime = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}`;
    return { value: formattedTime, label: formattedTime };
  });

  const handleFormSubmit = async (data: HabitFormData) => {
    // Ensure empty string or undefined reminder_time becomes null
    const dataToSubmit = {
      ...data,
      reminder_time: data.reminder_time || null,
      enable_notification: data.enable_notification ?? false, // Ensure boolean is sent
    };
    await onSubmit(dataToSubmit);
    // Keep modal open on error, close on success (handled by parent calling onOpenChange(false))
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-200">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Habit" : "Add New Habit"}
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(handleFormSubmit)}
          className="grid gap-4 py-4"
        >
          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right text-gray-400">
              Name
            </Label>
            <Input
              id="name"
              {...register("name")}
              className="col-span-3 bg-gray-700 border-gray-600 text-white"
              disabled={isSubmitting}
            />
          </div>
          {errors.name && (
            <p className="col-start-2 col-span-3 text-red-400 text-xs">
              {errors.name.message}
            </p>
          )}

          {/* Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="type" className="text-right text-gray-400">
              Type
            </Label>
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="type"
                    className="col-span-3 bg-gray-700 border-gray-600 text-white"
                  >
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 text-white">
                    <SelectItem value="positive">Positive (Build)</SelectItem>
                    <SelectItem value="negative">Negative (Avoid)</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.type && (
            <p className="col-start-2 col-span-3 text-red-400 text-xs">
              {errors.type.message}
            </p>
          )}

          {/* Log Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="log_type" className="text-right text-gray-400">
              Frequency
            </Label>
            <Controller
              name="log_type"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="log_type"
                    className="col-span-3 bg-gray-700 border-gray-600 text-white"
                  >
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 text-white">
                    <SelectItem value="once_daily">Once Daily</SelectItem>
                    <SelectItem value="multiple_daily">
                      Multiple Times Daily
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.log_type && (
            <p className="col-start-2 col-span-3 text-red-400 text-xs">
              {errors.log_type.message}
            </p>
          )}

          {/* Reminder Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="reminder_time" className="text-right text-gray-400">
              Reminder (Optional)
            </Label>
            {/* Replace Input with Select */}
            <Controller
              name="reminder_time"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={(value) => field.onChange(value || null)} // Ensure null if cleared
                  value={field.value ?? ""} // Handle null value for Select
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="reminder_time"
                    className="col-span-3 bg-gray-700 border-gray-600 text-white"
                  >
                    <SelectValue placeholder="Select time (15 min intervals)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 text-white max-h-60 overflow-y-auto">
                    {/* Remove the explicit "None" item with empty value */}
                    {timeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {errors.reminder_time && (
            <p className="col-start-2 col-span-3 text-red-400 text-xs">
              {errors.reminder_time.message}
            </p>
          )}

          {/* Enable Notification */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label
              htmlFor="enable_notification"
              className="text-right text-gray-400"
            >
              Reminder Notification
            </Label>
            {/* Use Controller for checkbox integration */}
            <Controller
              name="enable_notification"
              control={control}
              render={({ field }) => (
                <div className="col-span-3 flex items-center space-x-2">
                  <Checkbox
                    id="enable_notification"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                    className="border-gray-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                  />
                  <Label
                    htmlFor="enable_notification"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-gray-300"
                  >
                    Enable push notification reminder at the specified time.
                    (Requires a reminder time to be set)
                  </Label>
                </div>
              )}
            />
          </div>
          {/* No error message needed for boolean usually */}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSubmitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Add Habit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
