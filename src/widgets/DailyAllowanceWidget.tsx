import React, { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { useFinance } from "@/components/datasources/FinanceDataSource";
import { Button } from "@/components/ui/button";
import { PiggyBank, PlusCircle } from "lucide-react"; // Removed Loader2
import { formatCurrency } from "@/lib/currencies";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ExpenseEntryModal } from "@/components/finance/ExpenseEntryModal";

interface DailyAllowanceWidgetProps {
  id: string; // Widget instance ID
  // w, h are provided by react-grid-layout but might not be needed directly
}

// --- Custom Hook for Animated Counter (Slot Machine Style) ---
// (Simple version: increments/decrements towards target)
// TODO: Enhance for actual slot machine visual effect if needed
function useAnimatedCounter(targetValue: number | null, duration = 500) {
  // Explicitly type useState as a potential fix for the TS error
  const [displayValue, setDisplayValue] = useState<number>(targetValue ?? 0);
  const valueRef = useRef(targetValue ?? 0);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const finalTarget = targetValue ?? 0;
    const startValue = valueRef.current;
    const diff = finalTarget - startValue;

    if (diff === 0) return; // No change needed

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1); // Ensure progress doesn't exceed 1

      // Simple linear interpolation (can be replaced with easing functions)
      const currentVal = startValue + diff * progress;
      setDisplayValue(currentVal);
      valueRef.current = currentVal; // Update ref for next animation start

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        // Ensure final value is exact
        setDisplayValue(finalTarget);
        valueRef.current = finalTarget;
      }
    };

    // Cancel previous animation frame if any
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(step);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration]); // Rerun animation when targetValue changes

  return displayValue;
}

export const DailyAllowanceWidget: React.FC<DailyAllowanceWidgetProps> = () => {
  const {
    settings,
    remainingToday,
    isLoadingSettings,
    isLoadingEntries: __isLoadingEntries,
  } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use default values if settings/remainingToday are null/undefined initially
  const goal = settings?.daily_allowance_goal ?? null; // Keep goal as null if not set
  const currency = settings?.currency ?? "USD"; // Default currency
  // Don't use isLoading for rendering main content anymore
  // const isLoading = isLoadingSettings || isLoadingEntries;

  // Use the animated counter hook for the remaining amount
  const animatedRemaining = useAnimatedCounter(remainingToday);

  // Calculate percentage for progress bar using the *target* remainingToday
  const percentage =
    goal && goal > 0 && remainingToday !== null
      ? Math.max(0, Math.round((remainingToday / goal) * 100))
      : 0;

  // Determine color based on the *target* remainingToday
  let pathColor = "rgba(59, 130, 246, 1)"; // Default blue
  let iconColor = "text-blue-400"; // Default icon color
  if (goal && remainingToday !== null) {
    const ratio = remainingToday / goal;
    if (ratio <= 0.1) {
      pathColor = "rgba(239, 68, 68, 1)"; // Red if <= 10%
      iconColor = "text-red-400";
    } else if (ratio <= 0.5) {
      pathColor = "rgba(234, 179, 8, 1)"; // Yellow if <= 50%
      iconColor = "text-yellow-400";
    }
  }

  return (
    <div className="p-3 h-full w-full flex flex-col text-sm text-gray-300">
      {/* Removed loading check */}
      {goal === null && !isLoadingSettings ? ( // Show "No goal" only if loading finished and goal is null
        <div className="flex-1 flex flex-col justify-center items-center text-center">
          <p className="text-gray-400 mb-2">No daily goal set.</p>
          <p className="text-xs text-gray-500">
            Set a goal in Finance Settings.
          </p>
        </div>
      ) : (
        // Main content area: Always render, use defaults/animated values
        <div className="flex-1 flex flex-col justify-between items-center pt-2">
          {/* Top section: Progress circle and text info side-by-side */}
          <div className="flex items-center justify-center gap-4 w-full">
            {/* Progress Bar Container */}
            <div className="w-16 h-16 relative flex-shrink-0">
              <CircularProgressbar
                value={percentage} // Percentage updates instantly, transition handled by CSS
                strokeWidth={8}
                styles={buildStyles({
                  strokeLinecap: "round",
                  pathTransitionDuration: 0.5, // CSS transition duration
                  pathColor: pathColor,
                  trailColor: "rgba(255, 255, 255, 0.1)",
                })}
              />
              {/* Icon centered inside */}
              <div className="absolute inset-0 flex items-center justify-center">
                <PiggyBank className={`w-6 h-6 ${iconColor}`} />
              </div>
            </div>
            {/* Text beside */}
            <div className="text-left leading-tight">
              <span className="text-2xl font-bold text-gray-100 block tabular-nums">
                {/* Use animated value here */}
                {formatCurrency(animatedRemaining, currency)}
              </span>
              <span className="text-xs text-gray-400">
                {/* Use goal directly, formatCurrency handles null */}
                Left of {formatCurrency(goal, currency)}
              </span>
            </div>
          </div>

          {/* Bottom section: Record Expense Button */}
          <Button
            variant="outline"
            size="sm"
            className="mt-3 border-gray-600 hover:bg-gray-700 hover:text-gray-100 text-gray-300 w-full"
            onClick={() => setIsModalOpen(true)}
            disabled={goal === null} // Disable if no goal is set
          >
            <PlusCircle className="w-4 h-4 mr-1.5" />
            Record Expense
          </Button>
        </div>
      )}

      {/* Expense Modal */}
      <ExpenseEntryModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};
