import { Button } from "@/components/ui/button";
import { usePomodoroStore } from "@/stores/pomodoroStore"; // Import from Zustand store
import { cn } from "@/lib/utils"; // Import cn for conditional classes
import { Pause, Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css"; // Import the styles

// Define common props for widget components
interface WidgetProps {
  id: string;
  w: number; // Add width
  h: number; // Add height
}

const WORK_DURATION = 25 * 60; // 25 minutes in seconds
const BREAK_DURATION = 5 * 60; // 5 minutes in seconds
const NOTIFICATION_SOUND_SRC = "/audio/pomodoro_notification.mp3"; // Path to notification sound

// Prefix unused props with underscore to satisfy TypeScript/ESLint
export function PomodoroWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const { setPomodoroState: setGlobalPomodoroState } = usePomodoroStore(); // Get state and setter from store
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION); // Tracks countdown OR countup time
  const [isActive, setIsActive] = useState(false);
  const [isWorkPhase, setIsWorkPhase] = useState(true); // True for 'work', false for 'break'
  const [isOverflow, setIsOverflow] = useState(false); // New state for overflow
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null); // Ref for notification sound

  // Initialize notification audio element
  useEffect(() => {
    if (!notificationAudioRef.current) {
      console.log("Creating notification Audio element");
      notificationAudioRef.current = new Audio(NOTIFICATION_SOUND_SRC);
      notificationAudioRef.current.load(); // Preload audio
    }
    // No cleanup needed for this simple audio element ref
  }, []);

  // Function to format time left into MM:SS
  const formatTime = (seconds: number): string => {
    const absSeconds = Math.abs(seconds); // Use absolute value for formatting
    const mins = Math.floor(absSeconds / 60);
    const secs = absSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Function to clear the interval
  const clearTimerInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Function to play notification sound
  const playNotification = useCallback(() => {
    if (notificationAudioRef.current) {
      notificationAudioRef.current.currentTime = 0; // Rewind to start
      notificationAudioRef.current.play().catch((error) => {
        console.error("Error playing notification sound:", error);
        // Autoplay might be blocked by the browser if user hasn't interacted yet
      });
    }
  }, []);

  // Effect to handle the countdown/countup
  useEffect(() => {
    if (isActive) {
      // Clear any existing interval before starting a new one
      clearTimerInterval();
      intervalRef.current = setInterval(() => {
        if (isOverflow) {
          // --- Countup Logic ---
          setTimeLeft((prevTime) => prevTime + 1); // Increment time
        } else {
          // --- Countdown Logic ---
          setTimeLeft((prevTime) => {
            if (prevTime <= 1) {
              // Timer finished, start overflow
              console.log("Phase ended, starting overflow");
              setIsOverflow(true);
              playNotification(); // Play sound when overflow starts
              // Only set global state to idle if the BREAK phase just ended.
              // If the WORK phase ended, keep the global state as 'work'.
              if (!isWorkPhase) {
                setGlobalPomodoroState("idle"); // Hide banner after break overflow starts
              }
              return 0; // Start overflow count from 0
            }
            return prevTime - 1; // Decrement time
          });
        }
      }, 1000);
    } else {
      clearTimerInterval();
    }

    // Cleanup interval on component unmount or when isActive changes
    return () => clearTimerInterval();
    // Now depends on isOverflow as well, so interval restarts correctly when overflow starts/stops
  }, [
    isActive,
    isOverflow,
    isWorkPhase,
    clearTimerInterval,
    setGlobalPomodoroState, // Use global setter
    playNotification,
  ]); // Added playNotification dependency

  // Handle Start/Pause button click
  const handleToggle = () => {
    // const nextIsActive = !isActive; // Calculate based on current state below

    if (isActive && isOverflow) {
      // --- Pausing during Overflow ---
      console.log("Pausing during overflow, resetting to next phase");
      // clearTimerInterval(); // Already cleared by setIsActive(false) via useEffect
      setIsActive(false);
      setIsOverflow(false);
      const nextIsWorkPhase = !isWorkPhase; // Switch to the *next* phase
      setIsWorkPhase(nextIsWorkPhase);
      setTimeLeft(nextIsWorkPhase ? WORK_DURATION : BREAK_DURATION); // Set time for next phase
      setGlobalPomodoroState("idle"); // Remain idle
    } else if (isActive && !isOverflow) {
      // --- Pausing during Normal Countdown ---
      console.log("Pausing timer normally");
      // clearTimerInterval(); // Already cleared by setIsActive(false) via useEffect
      setIsActive(false);
      setGlobalPomodoroState("idle");
    } else {
      // --- Starting / Resuming ---
      console.log("Starting/Resuming timer");
      // If starting after overflow, isOverflow should be true, but isActive is false.
      // We need to handle this case - reset to next phase? Or resume overflow?
      // Let's assume starting always begins the current phase normally (or resumes countdown)
      // If isOverflow is true here, it means we paused during overflow and are now starting again
      // The logic above handles resetting to the next phase when pausing overflow.
      // So, if we reach here and !isActive, isOverflow should be false.
      if (isOverflow) {
        console.warn(
          "Trying to start timer while in overflow state - resetting phase."
        );
        // This case shouldn't ideally be reachable if pause logic is correct. Reset fully.
        handleReset(); // Call full reset
        // Then start the timer after reset state is applied (needs slight delay or better state management)
        // For now, let's just reset and require another click to start.
        return; // Exit after reset
      }

      setIsActive(true);
      // Set global state only if starting a normal countdown, not resuming overflow
      // (Overflow keeps 'work' state from previous phase or 'idle' if break overflow)
      if (!isOverflow) {
        // Check again, although should be false here
        setGlobalPomodoroState(isWorkPhase ? "work" : "break");
      }
    }
  };

  // Handle Reset button click
  const handleReset = () => {
    console.log("Resetting timer");
    clearTimerInterval();
    setIsActive(false);
    setIsOverflow(false); // Reset overflow state
    setIsWorkPhase(true); // Reset to work phase
    setTimeLeft(WORK_DURATION);
    setGlobalPomodoroState("idle"); // Reset global state
  };

  // Determine button text and phase display
  const phaseText = isWorkPhase ? "Work" : "Break";
  const buttonIcon = isActive ? <Pause size={18} /> : <Play size={18} />;

  // Calculate progress percentage - show 100% during overflow
  const totalDuration = isWorkPhase ? WORK_DURATION : BREAK_DURATION;
  const percentage = isOverflow
    ? 100 // Show full bar during overflow
    : totalDuration > 0
    ? ((totalDuration - timeLeft) / totalDuration) * 100
    : 0;

  // Define colors for progress bar and text
  const pathColor = isOverflow
    ? "rgba(234, 179, 8, 1)" // Yellow for overflow
    : isWorkPhase
    ? `rgba(59, 130, 246, ${isActive ? 1 : 0.5})` // Blue for work
    : `rgba(34, 197, 94, ${isActive ? 1 : 0.5})`; // Green for break
  const trailColor = "rgba(55, 65, 81, 0.5)"; // gray-700 with opacity
  const timerTextColor = isOverflow ? "text-yellow-400" : "text-gray-100";

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-center">
      {/* Progress Bar Wrapper */}
      <div className="relative w-32 h-32 mb-4">
        {" "}
        {/* Adjust size as needed */}
        <CircularProgressbar
          value={percentage}
          strokeWidth={8} // Adjust thickness
          styles={buildStyles({
            strokeLinecap: "round",
            pathTransitionDuration: isOverflow ? 0 : 0.5, // No transition during overflow
            pathColor: pathColor,
            trailColor: trailColor,
          })}
        />
        {/* Inner Content (Timer and Badge) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="mb-1">
            <span
              className={`px-2 py-0.5 rounded text-xs font-medium ${
                isWorkPhase
                  ? "bg-blue-600 text-blue-100"
                  : "bg-green-600 text-green-100"
              }`}
            >
              {/* Show overflow indicator? Maybe later */}
              {phaseText} {isOverflow ? "(+)" : ""}
            </span>
          </div>
          {/* Apply overflow color */}
          <div className={cn("text-2xl font-semibold", timerTextColor)}>
            {isOverflow ? "+" : ""}
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        <Button
          onClick={handleToggle}
          variant={isActive ? "outline" : "default"}
          size="sm"
          className="w-20"
        >
          {buttonIcon}
          <span className="ml-1">{isActive ? "Pause" : "Start"}</span>
        </Button>
        <Button
          onClick={handleReset}
          variant="ghost"
          size="icon"
          className="text-gray-400 hover:text-gray-100"
          title="Reset Timer"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );
}
