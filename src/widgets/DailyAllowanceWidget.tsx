import React, { useState, useEffect, useRef } from "react"; // Added useEffect, useRef
import { useFinance } from "@/contexts/FinanceContext"; // Updated import path
import { Button } from "@/components/ui/button";
import { PiggyBank, PlusCircle } from "lucide-react"; // Removed Loader2
import { formatCurrency } from "@/lib/currencies";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { ExpenseEntryModal } from "@/components/ExpenseEntryModal"; // Updated import path
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components

interface DailyAllowanceWidgetProps {
  id: string; // Widget instance ID
  // w, h are provided by react-grid-layout but might not be needed directly
}

function useAnimatedCounter(targetValue: number | null, duration = 500) {
  const [displayValue, setDisplayValue] = useState<number>(targetValue ?? 0);
  const prevTargetPropRef = useRef<number | null>(targetValue);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const newTarget = targetValue ?? 0;
    const oldTargetProp = prevTargetPropRef.current ?? 0;

    // Always update prevTargetPropRef to the current targetValue to ensure we track the latest value.
    prevTargetPropRef.current = targetValue;

    // Start animation if the target value has changed or if displayValue is not at the target.
    if (newTarget !== oldTargetProp || displayValue !== newTarget) {
      const startValue = displayValue;
      const endValue = newTarget;
      const diff = endValue - startValue;

      // If no difference, set the value directly without animation.
      if (diff === 0) {
        if (displayValue !== endValue) {
          setDisplayValue(endValue);
        }
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = undefined;
        }
        return;
      }

      let startTime: number | null = null;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const currentAnimatedValue = startValue + diff * progress;

        setDisplayValue(currentAnimatedValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(step);
        } else {
          setDisplayValue(endValue); // Ensure final value is exact
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(step);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
    };
  }, [targetValue, duration]); // Removed displayValue from dependencies to avoid unnecessary re-renders.

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

  // Use the animated counter hook for the remaining amount
  const animatedRemaining = useAnimatedCounter(remainingToday);

  // Calculate percentage for progress bar using the *target* remainingToday
  const percentage =
    goal && goal > 0 && remainingToday !== null
      ? Math.max(0, Math.round((remainingToday / goal) * 100))
      : 0;

  // Determine color based on the *target* remainingToday
  let pathColor = "rgba(52, 211, 153, 1)";
  let iconColor = "text-emerald-400"; // Default icon color
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
    <TooltipProvider delayDuration={300}>
      {/* Ensure outer div allows centering */}
      <div className="p-3 h-full w-full flex flex-col justify-center items-center text-sm text-gray-300">
        {goal === null && !isLoadingSettings ? (
          <div className="flex-1 flex flex-col justify-center items-center text-center">
            <p className="text-gray-400 mb-2">No daily goal set.</p>
            <p className="text-xs text-gray-500">
              Set a goal in Finance Settings.
            </p>
          </div>
        ) : (
          // This div centers the content horizontally within the widget space
          <div className="flex flex-col justify-center items-center">
            {/* Main Row: Progress circle and text/button group */}
            {/* Use items-center to vertically align circle and text/button group */}
            {/* Removed w-full, parent div handles centering */}
            <div className="flex items-center gap-4">
              {/* Progress Bar Container */}
              <div className="w-16 h-16 relative flex-shrink-0">
                <CircularProgressbar
                  value={percentage}
                  strokeWidth={8}
                  styles={buildStyles({
                    strokeLinecap: "round",
                    pathTransitionDuration: 0.5,
                    pathColor: pathColor,
                    trailColor: "rgba(255, 255, 255, 0.1)",
                  })}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <PiggyBank className={`w-6 h-6 ${iconColor}`} />
                </div>
              </div>
              {/* Text and Button Group */}
              {/* Use flex-row items-center to align text block and button horizontally AND vertically center them */}
              <div className="flex flex-row items-center justify-start gap-2 flex-grow min-w-0">
                {/* Text block */}
                <div className="text-left leading-tight">
                  <span className="text-2xl font-bold text-gray-100 block tabular-nums">
                    {formatCurrency(animatedRemaining, currency)}
                  </span>
                  <span className="text-xs text-gray-400">
                    Left of {formatCurrency(goal, currency)}
                  </span>
                </div>
                {/* Button next to text */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      // Rely on variant/size for icon-only feel, add hover color
                      className="h-7 w-7 text-gray-400 hover:text-green-400 flex-shrink-0"
                      onClick={() => setIsModalOpen(true)}
                      disabled={goal === null}
                    >
                      <PlusCircle className="w-5 h-5" />
                      <span className="sr-only">Record Expense</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Record Expense</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        )}

        {/* Expense Modal */}
        <ExpenseEntryModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      </div>
    </TooltipProvider>
  );
};
