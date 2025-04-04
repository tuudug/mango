import React, { useState, useEffect } from "react";
import { useFinance } from "@/components/datasources/FinanceDataSource";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Save, Trash2, X, Landmark } from "lucide-react"; // Import X and Landmark
import { getCurrencySymbol, formatCurrency } from "@/lib/currencies"; // Import helpers
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Import Card components

// Define specific type for salary schedule entries (can be shared)
interface SalaryPayment {
  dayOfMonth: number;
  amount: number;
}

// Type for the form state
interface SettingsFormState {
  currency: string;
  daily_allowance_goal: string; // Use string for input
  salary_schedule: SalaryPayment[]; // Keep as array for now
}

// Define props including onClose
interface FinanceSettingsPanelProps {
  onClose?: () => void; // Make onClose optional
}

export const FinanceSettingsPanel: React.FC<FinanceSettingsPanelProps> = ({
  onClose,
}) => {
  // Destructure onClose
  const {
    settings,
    todaysExpenses, // Get today's expenses
    deleteExpense, // Get delete function
    updateSettings,
    isLoadingSettings,
    isLoadingEntries, // Get entries loading state
  } = useFinance();
  const [formState, setFormState] = useState<SettingsFormState>({
    currency: "",
    daily_allowance_goal: "",
    salary_schedule: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null); // State to track deleting

  // Update form state when settings load from context
  useEffect(() => {
    if (settings) {
      setFormState({
        currency: settings.currency || "USD", // Default if null
        daily_allowance_goal: settings.daily_allowance_goal?.toString() || "", // Convert number to string for input
        salary_schedule: settings.salary_schedule || [],
      });
    }
  }, [settings]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    const goal = parseFloat(formState.daily_allowance_goal);
    const settingsToSave = {
      currency: formState.currency || null,
      daily_allowance_goal: !isNaN(goal) ? goal : null,
      salary_schedule: formState.salary_schedule,
    };
    await updateSettings(settingsToSave);
    setIsSaving(false);
  };

  const handleDeleteEntry = async (id: string) => {
    setDeletingId(id); // Indicate which item is being deleted
    await deleteExpense(id);
    setDeletingId(null); // Reset deleting state
  };

  const currencySymbol = getCurrencySymbol(formState.currency);

  return (
    // Use Card structure for consistency
    <Card className="h-full flex flex-col shadow-lg border-l bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 border-gray-700">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-emerald-400" />{" "}
          {/* Use finance icon */}
          <CardTitle className="text-lg font-semibold">
            Finance Settings
          </CardTitle>
        </div>
        {onClose && ( // Conditionally render close button
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X size={16} />
            <span className="sr-only">Close Panel</span>
          </Button>
        )}
      </CardHeader>

      <CardContent className="flex-1 p-4 overflow-y-auto">
        <ScrollArea className="h-full pr-3">
          {" "}
          {/* Apply ScrollArea here */}
          {/* Settings Form */}
          <div className="space-y-4 mb-6 pb-4 border-b border-gray-700">
            {/* Currency */}
            <div>
              <Label htmlFor="currency" className="text-sm text-gray-400">
                Currency Code
              </Label>
              <Input
                id="currency"
                name="currency"
                value={formState.currency}
                onChange={handleInputChange}
                placeholder="e.g., USD, MNT"
                className="mt-1 bg-gray-700 border-gray-600 text-gray-100"
                maxLength={3}
                disabled={isLoadingSettings || isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the 3-letter currency code (e.g., USD, EUR, MNT). Symbol:{" "}
                {currencySymbol || "?"}
              </p>
            </div>

            {/* Daily Allowance Goal */}
            <div>
              <Label
                htmlFor="daily_allowance_goal"
                className="text-sm text-gray-400"
              >
                Daily Allowance Goal ({currencySymbol || formState.currency})
              </Label>
              <Input
                id="daily_allowance_goal"
                name="daily_allowance_goal"
                type="number"
                value={formState.daily_allowance_goal}
                onChange={handleInputChange}
                placeholder="e.g., 50.00"
                className="mt-1 bg-gray-700 border-gray-600 text-gray-100"
                step="0.01"
                min="0"
                disabled={isLoadingSettings || isSaving}
              />
              <p className="text-xs text-gray-500 mt-1">
                Set a daily spending limit. Leave blank for no limit.
              </p>
            </div>

            {/* Salary Schedule (Display Only for now) */}
            <div>
              <Label className="text-sm text-gray-400 block mb-1">
                Salary Schedule (Read-only)
              </Label>
              <div className="p-3 bg-gray-700 rounded-md border border-gray-600 text-gray-300 text-sm min-h-[50px]">
                {formState.salary_schedule.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1">
                    {formState.salary_schedule.map((payment, index) => (
                      <li key={index}>
                        Day {payment.dayOfMonth}:{" "}
                        {formatCurrency(payment.amount, formState.currency)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-500 italic">No schedule set.</p>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Editing salary schedule coming soon.
              </p>
            </div>
            {/* Save Settings Button */}
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || isLoadingSettings}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
          {/* Today's Expenses List */}
          <div>
            <h3 className="text-md font-semibold mb-2 text-gray-200">
              Today&apos;s Expenses
            </h3>
            {isLoadingEntries ? (
              <div className="flex justify-center items-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            ) : todaysExpenses.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No expenses recorded today.
              </p>
            ) : (
              <ul className="space-y-2">
                {todaysExpenses.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between p-2 bg-gray-700 rounded-md border border-gray-600"
                  >
                    <div className="flex-1 overflow-hidden mr-2">
                      <p className="text-sm text-gray-100 truncate">
                        {formatCurrency(entry.amount, formState.currency)}
                      </p>
                      {entry.description && (
                        <p className="text-xs text-gray-400 truncate">
                          {entry.description}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-400 flex-shrink-0"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={deletingId === entry.id} // Disable while deleting this specific item
                      title="Delete Expense"
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
