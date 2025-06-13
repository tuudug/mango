import React, { useState, useEffect } from "react";
import { useFinanceStore } from "@/stores/financeStore"; // Import Zustand store
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currencies";
import { format, parseISO, isValid } from "date-fns"; // Import date functions

interface ExpenseEntryModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const ExpenseEntryModal: React.FC<ExpenseEntryModalProps> = ({
  isOpen,
  onOpenChange,
}) => {
  const { addExpense, settings, fetchTodaysEntries } = useFinanceStore();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [entryDate, setEntryDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currencySymbol = getCurrencySymbol(settings?.currency);

  // Reset form when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      // Reset to today's date when opening
      setEntryDate(format(new Date(), "yyyy-MM-dd"));
    } else {
      // Delay reset to allow closing animation
      setTimeout(() => {
        setAmount("");
        setDescription("");
        setError(null);
        setIsSaving(false);
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const numericAmount = parseFloat(amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    // Validate date format before submitting
    const parsedDate = parseISO(entryDate);
    if (!isValid(parsedDate)) {
      setError("Please enter a valid date (YYYY-MM-DD).");
      return;
    }
    const formattedDate = format(parsedDate, "yyyy-MM-dd"); // Ensure correct format

    setIsSaving(true);
    try {
      // Pass the formatted date string to addExpense
      const success = await addExpense(
        numericAmount,
        description || null,
        formattedDate
      );

      if (success) {
        // Force an immediate refresh of today's expenses
        if (formattedDate === format(new Date(), "yyyy-MM-dd")) {
          await fetchTodaysEntries();
        }
        onOpenChange(false); // Close modal only after the data has been refreshed
      } else {
        setError("Failed to save expense. Please try again.");
      }
    } catch (err) {
      setError("An error occurred while saving the expense.");
      console.error("Error in expense entry:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-100">
        <DialogHeader>
          <DialogTitle>Record New Expense</DialogTitle>
          <DialogDescription>
            Enter the amount, date (optional, defaults to today), and an
            optional description.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Amount Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right text-gray-400">
                Amount ({currencySymbol})
              </Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 text-gray-100"
                required
                disabled={isSaving}
              />
            </div>
            {/* Date Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="entryDate" className="text-right text-gray-400">
                Date
              </Label>
              <Input
                id="entryDate"
                name="entryDate"
                type="date" // Use date input type
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 text-gray-100"
                required
                disabled={isSaving}
              />
            </div>
            {/* Description Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right text-gray-400">
                Description
              </Label>
              <Input
                id="description"
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="col-span-3 bg-gray-700 border-gray-600 text-gray-100"
                placeholder="(Optional)"
                disabled={isSaving}
              />
            </div>
            {error && (
              <p className="col-span-4 text-center text-red-400 text-sm">
                {error}
              </p>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
