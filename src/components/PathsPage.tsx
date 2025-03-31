import React, { useState } from "react"; // Import useState
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Import Dialog components
import {
  ListChecks, // Productivity
  HeartPulse, // Health
  Brain, // Mindfulness
  Bot, // Game Master
  Gamepad2, // Gamification
  Footprints, // Steps
  CalendarCheck, // Habit
  Bed, // Sleep
  Wind, // Air Quality / Ambience
  Clock, // Pomodoro
  CalendarDays, // Calendar
  Target, // Goal
  BookOpenText, // Journal
  Sparkles, // Affirmation
  Radio, // Ambience Base?
  BarChartHorizontalBig, // Reports
  LineChart, // Analysis
  ClipboardList, // Routine
  MicVocal, // GM Tone
  Gauge, // GM Limit
  CloudRain, // Rain
  Trophy, // Achievement
  Puzzle, // Puzzle
  Lock, // Locked state
  Check, // Unlocked state
  Milestone, // Path Icon
  Star, // Added Star for active path
  Info, // Added Info icon
  X, // Keep X for modal close button
  TrendingUp, // XP/Progress
  Repeat, // Switching Paths
  Gift, // Unlocks
  AlertTriangle, // Added AlertTriangle
} from "lucide-react";

interface PathsPageProps {
  onClose: () => void; // Add onClose prop
  activePathName: string | null;
  setActivePath: (pathName: string) => void;
  unlockedItems: Record<string, boolean>;
  currentPathProgressXP: number;
  nextUnlockXP: number;
}

interface PathItem {
  label: string;
  icon: React.ElementType;
  xpCost: number;
  isUpgrade?: boolean;
}

interface Path {
  name: string;
  icon: React.ElementType;
  items: PathItem[];
}

// Define the paths and their items with XP costs (Keep this data structure)
const pathsData: Path[] = [
  {
    name: "Productivity",
    icon: ListChecks,
    items: [
      { label: "To-Do List", icon: ListChecks, xpCost: 0 },
      { label: "Calendars", icon: CalendarDays, xpCost: 100 },
      { label: "Goal Tracker", icon: Target, xpCost: 250 },
      { label: "Pomodoro", icon: Clock, xpCost: 500 },
      {
        label: "Pomodoro Reports",
        icon: BarChartHorizontalBig,
        xpCost: 1000,
        isUpgrade: true,
      },
    ],
  },
  {
    name: "Health & Wellness",
    icon: HeartPulse,
    items: [
      { label: "Steps Tracker", icon: Footprints, xpCost: 0 },
      { label: "Habit Graph", icon: CalendarCheck, xpCost: 150 },
      { label: "Sleep Widget", icon: Bed, xpCost: 300 },
      { label: "Air Quality", icon: Wind, xpCost: 600 },
      {
        label: "Sleep Analysis",
        icon: LineChart,
        xpCost: 1200,
        isUpgrade: true,
      },
      {
        label: "Routine Generator",
        icon: ClipboardList,
        xpCost: 2000,
        isUpgrade: true,
      },
    ],
  },
  {
    name: "Mindfulness/Focus",
    icon: Brain,
    items: [
      { label: "Journal", icon: BookOpenText, xpCost: 0 },
      { label: "Ambience", icon: Radio, xpCost: 100 },
      { label: "Affirmation", icon: Sparkles, xpCost: 200 },
      { label: "Rain Sound", icon: CloudRain, xpCost: 400, isUpgrade: true },
      { label: "Wind Sound", icon: Wind, xpCost: 400, isUpgrade: true },
    ],
  },
  {
    name: "Game Master",
    icon: Bot,
    items: [
      { label: "GM Tones", icon: MicVocal, xpCost: 300 },
      { label: "GM Limit Up", icon: Gauge, xpCost: 750, isUpgrade: true },
    ],
  },
  {
    name: "Gamification",
    icon: Gamepad2,
    items: [
      { label: "Puzzles", icon: Puzzle, xpCost: 200 },
      { label: "Achievements", icon: Trophy, xpCost: 500 },
    ],
  },
];

export function PathsPage({
  onClose, // Add onClose prop
  activePathName,
  setActivePath,
  unlockedItems,
  currentPathProgressXP,
  nextUnlockXP,
}: PathsPageProps) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingSwitchPath, setPendingSwitchPath] = useState<string | null>(
    null
  );

  const handleSelectPathClick = (pathName: string) => {
    if (pathName === activePathName) return;
    setPendingSwitchPath(pathName);
    setIsConfirmDialogOpen(true);
  };

  const confirmPathSwitch = () => {
    if (pendingSwitchPath) {
      setActivePath(pendingSwitchPath);
    }
    setIsConfirmDialogOpen(false);
    setPendingSwitchPath(null);
  };

  const cancelPathSwitch = () => {
    setIsConfirmDialogOpen(false);
    setPendingSwitchPath(null);
  };

  const calculateProgressPercent = (current: number, next: number): number => {
    if (next <= 0) return 100;
    return Math.min(100, Math.round((current / next) * 100));
  };

  return (
    <>
      <aside className="h-full w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2">
            <Milestone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
              Progression Paths
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Info Dialog Trigger */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Info size={16} />
                  <span className="sr-only">About Paths</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Milestone className="w-5 h-5 text-indigo-500" />
                    About Progression Paths
                  </DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4 text-sm text-gray-600 dark:text-gray-300">
                  <div className="flex items-start gap-3">
                    <Star
                      className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                    />
                    <p>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Active Path:
                      </span>{" "}
                      Only one path can be active at a time. Your earned XP will
                      contribute towards the next unlock on this path.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Earning XP:
                      </span>{" "}
                      All the XP you earn will count towards your selected paths
                      progress.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Gift className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Unlocking Items:
                      </span>{" "}
                      When you reach the required XP for the next item on your
                      active path, it unlocks automatically!
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <Repeat className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold text-gray-800 dark:text-gray-100">
                        Switching Paths:
                      </span>{" "}
                      You can switch your active path anytime.{" "}
                      <span className="font-medium text-orange-600 dark:text-orange-400">
                        Warning:
                      </span>{" "}
                      Switching resets your XP progress towards the{" "}
                      <span>
                        <i>next </i>
                      </span>
                      unlock on the previous path. Already unlocked items remain
                      unlocked.
                    </p>
                  </div>
                </div>
                <DialogFooter className="sm:justify-end">
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      <X className="mr-2 h-4 w-4" /> Close
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {/* Close button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Paths Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {pathsData.map((path) => {
            const isActive = path.name === activePathName;
            const progressPercent = isActive
              ? calculateProgressPercent(currentPathProgressXP, nextUnlockXP)
              : 0;

            return (
              <div
                key={path.name}
                className={`p-3 rounded-lg border ${
                  isActive
                    ? "border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/30"
                    : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <path.icon
                      className={`w-4 h-4 flex-shrink-0 ${
                        isActive
                          ? "text-indigo-600 dark:text-indigo-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                    <h3
                      className={`text-base font-semibold ${
                        isActive
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {path.name}
                    </h3>
                    {isActive && (
                      <Star
                        className="w-3.5 h-3.5 text-yellow-500"
                        fill="currentColor"
                      />
                    )}
                  </div>
                  {!isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSelectPathClick(path.name)} // Updated onClick
                    >
                      Select Path
                    </Button>
                  )}
                </div>

                {/* Progress Bar for Active Path */}
                {isActive && nextUnlockXP > 0 && (
                  <div className="mb-3 px-1">
                    <Progress value={progressPercent} className="h-1.5" />
                    <p className="text-[10px] text-right text-gray-500 dark:text-gray-400 mt-0.5">
                      {currentPathProgressXP.toLocaleString()} /{" "}
                      {nextUnlockXP.toLocaleString()} XP to next unlock
                    </p>
                  </div>
                )}
                {isActive &&
                  nextUnlockXP <= 0 && ( // Path completed
                    <p className="text-xs text-center text-green-600 dark:text-green-400 mb-3">
                      Path Completed!
                    </p>
                  )}

                <ol className="relative border-l border-gray-300 dark:border-gray-600 ml-2 space-y-3">
                  {path.items.map((item, index) => {
                    const isItemUnlocked =
                      unlockedItems[item.label] || item.xpCost === 0;
                    return (
                      <li key={index} className="ml-5">
                        <span
                          className={`absolute flex items-center justify-center w-4 h-4 rounded-full -left-2 ring-4 ${
                            isActive
                              ? "ring-indigo-50 dark:ring-indigo-900/30"
                              : "ring-gray-50 dark:ring-gray-700/30"
                          } ${
                            isItemUnlocked
                              ? "bg-green-200 dark:bg-green-900"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        >
                          {isItemUnlocked ? (
                            <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Lock className="w-2.5 h-2.5 text-gray-500 dark:text-gray-400" />
                          )}
                        </span>
                        <div
                          className={`flex items-center gap-1.5 p-1 rounded-md ${
                            isItemUnlocked ? "" : "opacity-60"
                          }`}
                        >
                          <item.icon
                            className={`w-3.5 h-3.5 flex-shrink-0 ${
                              isItemUnlocked
                                ? "text-gray-700 dark:text-gray-300"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              isItemUnlocked
                                ? "text-gray-800 dark:text-gray-200"
                                : "text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            {item.label}{" "}
                            {item.isUpgrade ? (
                              <span className="text-[9px] text-indigo-500 dark:text-indigo-400">
                                (Upgrade)
                              </span>
                            ) : (
                              ""
                            )}
                          </span>
                        </div>
                        {!isItemUnlocked && (
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 ml-1">
                            {item.xpCost.toLocaleString()} XP
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      </aside>
      {/* Confirmation Dialog for Switching Paths */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Confirm Path Switch
            </DialogTitle>
            <DialogDescription className="pt-2">
              Switching from &apos;{activePathName || "None"}&apos; to &apos;
              {pendingSwitchPath}&apos; will reset your progress (
              {currentPathProgressXP.toLocaleString()} XP) towards the next
              unlock on the current path. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelPathSwitch}>
              Cancel
            </Button>
            <Button type="button" variant="default" onClick={confirmPathSwitch}>
              Confirm Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
