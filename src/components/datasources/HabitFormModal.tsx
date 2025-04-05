import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Import Select components
import { Habit } from "@/contexts/HabitsContext"; // Import Habit type

// Zod schema for validation
const habitFormSchema = z.object({
  name: z.string().min(1, "Habit name is required"),
  type: z.enum(["positive", "negative"], {
    required_error: "Habit type is required",
  }),
  log_type: z.enum(["once_daily", "multiple_daily"], {
    required_error: "Log frequency is required",
  }),
  reminder_time: z.string().optional().nullable(), // Optional time string HH:MM
});

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
        });
      } else {
        reset({
          // Reset to defaults for adding
          name: "",
          type: "positive",
          log_type: "once_daily",
          reminder_time: null,
        });
      }
    }
  }, [initialData, isEditing, reset, isOpen]);

  const handleFormSubmit = async (data: HabitFormData) => {
    // Ensure empty string reminder_time becomes null
    const dataToSubmit = {
      ...data,
      reminder_time: data.reminder_time || null,
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
            <Input
              id="reminder_time"
              type="time" // Use time input
              {...register("reminder_time")}
              className="col-span-3 bg-gray-700 border-gray-600 text-white"
              disabled={isSubmitting}
            />
          </div>
          {errors.reminder_time && (
            <p className="col-start-2 col-span-3 text-red-400 text-xs">
              {errors.reminder_time.message}
            </p>
          )}

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
