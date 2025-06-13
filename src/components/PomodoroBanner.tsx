import { usePomodoroStore } from "@/stores/pomodoroStore"; // Import from Zustand store
import { AnimatePresence, motion } from "framer-motion";
import { Timer } from "lucide-react";

export function PomodoroBanner() {
  const { pomodoroState } = usePomodoroStore(); // Use Zustand store

  // Only show banner during the 'work' phase
  const isActive = pomodoroState === "work";
  const text = "Work Phase Active"; // Text is now constant

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          key="pomodoro-banner" // Add key for AnimatePresence
          initial={{ height: 0, opacity: 0 }} // Start collapsed and invisible
          animate={{ height: "auto", opacity: 1 }} // Expand height and fade in
          exit={{ height: 0, opacity: 0 }} // Collapse height and fade out
          transition={{ duration: 0.3, ease: "easeInOut" }}
          // Removed fixed positioning classes
          // Added overflow hidden during animation to prevent content spill
          className="bg-red-600 text-white text-sm font-medium px-4 flex items-center justify-center shadow-md overflow-hidden"
          style={{ lineHeight: "normal" }} // Ensure line-height doesn't prevent collapse
          role="alert"
          aria-live="assertive"
        >
          {/* Inner div for padding that appears with height */}
          <div className="py-1.5 flex items-center justify-center">
            <Timer size={16} className="mr-2 flex-shrink-0" />
            <span>{text}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
