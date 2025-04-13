import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useHealth } from "@/contexts/HealthContext";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns"; // To format default date

interface WeightEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WeightEntryModal({ isOpen, onClose }: WeightEntryModalProps) {
  const { addManualHealthEntry, isLoading } = useHealth();
  const { showToast } = useToast();
  const [weight, setWeight] = useState("");
  const [entryDate, setEntryDate] = useState(format(new Date(), "yyyy-MM-dd")); // Default to today

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setWeight("");
      setEntryDate(format(new Date(), "yyyy-MM-dd"));
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNumber = parseFloat(weight);

    if (isNaN(weightNumber) || weightNumber <= 0) {
      showToast({
        title: "Invalid Input",
        description: "Please enter a valid positive number for weight.",
        variant: "error",
      });
      return;
    }

    if (!entryDate) {
      showToast({
        title: "Invalid Input",
        description: "Please select a date for the entry.",
        variant: "error",
      });
      return;
    }

    try {
      await addManualHealthEntry({
        entry_date: entryDate,
        type: "weight",
        value: weightNumber,
      });
      showToast({
        title: "Weight Entry Added",
        description: `Logged ${weightNumber} kg for ${entryDate}.`,
        variant: "success",
      });
      onClose(); // Close modal on success
    } catch (error) {
      // Error toast is handled within addManualHealthEntry context function
      console.error("Failed to add weight entry from modal:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-gray-850 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white">Log Weight Entry</DialogTitle>
          {/* Optional: Add DialogDescription if needed */}
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="entry-date" className="text-right text-gray-400">
                Date
              </Label>
              <Input
                id="entry-date"
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                required
                className="col-span-3 bg-gray-700 border-gray-600 text-white"
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="weight" className="text-right text-gray-400">
                Weight (kg)
              </Label>
              <Input
                id="weight"
                type="number"
                placeholder="e.g., 75.5"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                min="0"
                step="0.1"
                className="col-span-3 bg-gray-700 border-gray-600 text-white"
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
