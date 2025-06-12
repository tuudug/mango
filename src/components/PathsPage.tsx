import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
//// import { Input } from "@/components/ui/input"; // Added Input
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
// Import Tooltip components
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  pathsConfig,
  getPathById,
  // PathDefinition,
  PathReward,
} from "@/lib/pathsConfig"; // Import new config
import {
  // Lock,
  Check,
  Milestone,
  Star,
  Info,
  X,
  Repeat, // Keep Repeat for switching
  Gift, // Keep Gift for unlocks
  AlertTriangle,
  Sparkles as SparkIcon, // Use Sparkles for Sparks currency
} from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn utility

// Updated Props Interface
interface PathsPageProps {
  onClose: () => void;
  activePathId: string | null;
  setActivePathId: (pathId: string) => void;
  unlockedRewardIds: Set<string>; // Use Set for efficient lookup
  currentPathProgressSparks: number;
  // Removed totalSparks prop
  // Add function prop for allocating sparks (implementation later)
  onAllocateSparks: (amount: number) => void;
}

// import { useSparks } from "@/contexts/SparksContext"; // Import useSparks hook

export function PathsPage({
  onClose,
  activePathId,
  setActivePathId,
  unlockedRewardIds,
  currentPathProgressSparks,
}: // Removed totalSparks prop
// onAllocateSparks,
PathsPageProps) {
  // const { totalSparks } = useSparks(); // Get totalSparks from context
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingSwitchPathId, setPendingSwitchPathId] = useState<string | null>(
    null
  );
  // const [allocateAmount, setAllocateAmount] = useState(""); // State for allocation input
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false); // State for detail modal
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null); // State for selected path in modal

  const activePath = useMemo(
    () => (activePathId ? getPathById(activePathId) : null),
    [activePathId]
  );

  const selectedPath = useMemo(
    () => (selectedPathId ? getPathById(selectedPathId) : null),
    [selectedPathId]
  );

  const handleSelectPathClick = (pathId: string) => {
    // Don't open confirmation if clicking the already active path's disabled button area
    if (pathId === activePathId) return;
    setPendingSwitchPathId(pathId);
    setIsConfirmDialogOpen(true);
    setIsDetailModalOpen(false); // Close detail modal if open
  };

  const confirmPathSwitch = () => {
    if (pendingSwitchPathId) {
      setActivePathId(pendingSwitchPathId);
      // Reset local allocation amount on switch
      // setAllocateAmount("");
    }
    setIsConfirmDialogOpen(false);
    setPendingSwitchPathId(null);
  };

  const cancelPathSwitch = () => {
    setIsConfirmDialogOpen(false);
    setPendingSwitchPathId(null);
  };

  // const handleAllocateInputChange = (
  //   e: React.ChangeEvent<HTMLInputElement>
  // ) => {
  //   const value = e.target.value.replace(/[^0-9]/g, ""); // Allow only numbers
  //   setAllocateAmount(value);
  // };

  // const handleAllocateSubmit = () => {
  //   const amount = parseInt(allocateAmount, 10);
  //   if (!isNaN(amount) && amount > 0) {
  //     onAllocateSparks(amount); // Call the prop function
  //     setAllocateAmount(""); // Clear input after submission
  //   }
  // };

  // --- Calculate progress for the active path ---
  const { nextReward, progressPercent } = useMemo(() => {
    if (!activePath) return { nextReward: null, progressPercent: 0 };

    let nextReward: PathReward | null = null;
    for (const reward of activePath.rewards) {
      if (!reward.isPlaceholder && !unlockedRewardIds.has(reward.id)) {
        nextReward = reward;
        break;
      }
    }

    if (!nextReward || !nextReward.sparkCost) {
      // Path completed or next is placeholder
      return { nextReward: null, progressPercent: 100 };
    }

    const percent = Math.min(
      100,
      Math.round((currentPathProgressSparks / nextReward.sparkCost) * 100)
    );
    return { nextReward, progressPercent: percent };
  }, [activePath, unlockedRewardIds, currentPathProgressSparks]);
  // --- End progress calculation ---

  const getPendingPathName = () => {
    if (!pendingSwitchPathId) return "None";
    const path = getPathById(pendingSwitchPathId);
    return path?.name || "Unknown";
  };

  // Placeholder for Allocate Sparks Modal state
  // const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);

  const handleAllocateClick = () => {
    // TODO: Implement modal opening and logic
    console.log("Allocate Sparks button clicked - implement modal");
    // For now, just log, maybe open a simple alert or modal later
    // setIsAllocateModalOpen(true); // Example state change
  };

  const handleOpenDetailModal = (pathId: string) => {
    setSelectedPathId(pathId);
    setIsDetailModalOpen(true);
  };

  // const handleCloseDetailModal = () => {
  //   setIsDetailModalOpen(false);
  //   setSelectedPathId(null);
  // };

  return (
    // Standard Panel Structure
    <div className="flex h-full w-full flex-col bg-gray-800 text-gray-100">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-700 p-4">
        <div className="flex items-center gap-2">
          <Milestone className="h-5 w-5 text-indigo-400" />
          <h2 className="text-lg font-semibold">Progression Paths</h2>
        </div>
        <div className="flex items-center gap-2">
          {/* Removed Spark Balance Display */}
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
                  <Milestone className="h-5 w-5 text-indigo-500" />
                  About Progression Paths
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-gray-300">
                {/* Updated Info Text */}
                <div className="flex items-start gap-3">
                  <Star
                    className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500"
                    fill="currentColor"
                  />
                  <p>
                    <span className="font-semibold text-gray-100">
                      Active Path:
                    </span>{" "}
                    Only one path can be active. Earn Sparks by completing
                    Quests and allocate them to progress along your chosen path.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <SparkIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-400" />
                  <p>
                    <span className="font-semibold text-gray-100">
                      Earning & Allocating Sparks:
                    </span>{" "}
                    Sparks are earned primarily from Quests. Use the input on
                    your active path to allocate Sparks towards the next unlock.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                  <p>
                    <span className="font-semibold text-gray-100">
                      Unlocking Items:
                    </span>{" "}
                    When you allocate enough Sparks to meet the cost of the next
                    item, it unlocks automatically!
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Repeat className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                  <p>
                    <span className="font-semibold text-gray-100">
                      Switching Paths:
                    </span>{" "}
                    You can switch active paths anytime.{" "}
                    <span className="font-medium text-orange-400">
                      Warning:
                    </span>{" "}
                    Switching resets your Spark progress towards the{" "}
                    <span>
                      <i>next</i>
                    </span>{" "}
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

      {/* Main Scrollable Content Area */}
      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {/* --- Top Section: Active Path --- */}
        {activePath ? (
          <div className="mb-6 rounded-lg border border-indigo-500 bg-indigo-900/20 p-4">
            <div className="mb-3 flex items-center justify-between">
              {/* Path Info */}
              <div className="flex items-center gap-3">
                <activePath.icon
                  className="h-6 w-6 flex-shrink-0"
                  style={{ color: activePath.color }}
                />
                <div>
                  <h3 className="text-base font-semibold text-gray-100">
                    Active Path: {activePath.name}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {activePath.description}
                  </p>
                </div>
              </div>
              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Allocate Sparks Icon Button - Opens Modal (Modal TBD) */}
                {nextReward && (
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {/* Changed to round icon button */}
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 rounded-full"
                          onClick={handleAllocateClick}
                        >
                          <SparkIcon className="h-4 w-4" />
                          <span className="sr-only">Allocate Sparks</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Allocate Sparks
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {/* Removed Change Path button from here */}
              </div>
            </div>

            {/* Horizontal Reward Track & Progress */}
            <div className="space-y-1">
              {/* Progress Text */}
              <div className="flex justify-between text-xs text-gray-300">
                <span>
                  Progress: {currentPathProgressSparks.toLocaleString()} /{" "}
                  {(nextReward?.sparkCost ?? "-").toLocaleString()} Sparks
                </span>
                <span>{progressPercent}%</span>
              </div>
              {/* Progress Bar */}
              <Progress value={progressPercent} className="h-1.5 w-full" />
              {/* Horizontal Icons with Tooltips */}
              <div className="mt-2 flex justify-between gap-1">
                <TooltipProvider delayDuration={100}>
                  {activePath.rewards.map((reward: PathReward) => {
                    const isUnlocked = unlockedRewardIds.has(reward.id);
                    const isNext = reward.id === nextReward?.id;
                    const tooltipContent = `${reward.name}${
                      reward.sparkCost
                        ? ` (${reward.sparkCost.toLocaleString()} Sparks)`
                        : ""
                    }`;
                    return (
                      <Tooltip key={reward.id}>
                        <TooltipTrigger asChild>
                          <div className="flex flex-col items-center cursor-default">
                            {" "}
                            {/* Added cursor */}
                            <span
                              className={cn(
                                "flex h-5 w-5 items-center justify-center rounded-full mb-0.5",
                                isUnlocked
                                  ? "bg-green-600"
                                  : reward.isPlaceholder
                                  ? "bg-gray-600 opacity-50"
                                  : isNext
                                  ? "bg-indigo-600 ring-2 ring-indigo-400" // Highlight next unlockable
                                  : "bg-gray-700 opacity-70"
                              )}
                            >
                              {isUnlocked ? (
                                <Check className="h-3 w-3 text-white" />
                              ) : (
                                <reward.icon className="h-3 w-3 text-gray-300" />
                              )}
                            </span>
                            {/* Optional: Level number below icon */}
                            {/* <span className="text-[9px] text-gray-400">{index + 1}</span> */}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{tooltipContent}</p>
                          {!reward.isPlaceholder && (
                            <p className="text-[10px] text-gray-400">
                              {reward.description}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </TooltipProvider>
              </div>
            </div>

            {/* --- Next Unlock Section --- */}
            {nextReward && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h5 className="mb-2 text-xs font-medium text-gray-400">
                  Next Unlock:
                </h5>
                <div className="flex items-center gap-3">
                  {/* Next Reward Icon */}
                  <nextReward.icon className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  <div className="flex-grow">
                    {/* Next Reward Name and Cost */}
                    <p className="text-sm font-semibold text-gray-300">
                      {nextReward.name}
                      {nextReward.sparkCost && (
                        <span className="ml-2 text-xs font-normal text-yellow-400">
                          ({nextReward.sparkCost.toLocaleString()} Sparks)
                        </span>
                      )}
                    </p>
                    {/* Next Reward Description */}
                    {!nextReward.isPlaceholder && nextReward.description && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {nextReward.description}
                      </p>
                    )}
                  </div>
                  {/* Remaining Sparks */}
                  {nextReward.sparkCost && (
                    <div className="flex flex-col items-end text-right">
                      <span className="text-xs text-gray-400">Remaining:</span>
                      <span className="text-sm font-semibold text-yellow-400 flex items-center gap-1">
                        {" "}
                        {/* Added flex and gap */}
                        <SparkIcon
                          className="h-3 w-3"
                          fill="currentColor"
                        />{" "}
                        {/* Added Spark Icon */}
                        {(
                          nextReward.sparkCost - currentPathProgressSparks
                        ).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // Placeholder if no active path
          <div className="mb-6 flex h-24 items-center justify-center rounded-lg border border-dashed border-gray-600 text-center text-gray-500">
            <div>
              <Milestone className="mx-auto mb-1 h-6 w-6" />
              <p className="text-sm">No active path selected.</p>
              <p className="text-xs">Choose a path below to begin.</p>
            </div>
          </div>
        )}

        {/* --- Bottom Section: Available Paths --- */}
        <div>
          <h4 className="mb-3 text-sm font-medium text-gray-400">
            Available Paths:
          </h4>
          {/* Display paths in a 2-column grid */}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            {/* Changed to grid layout */}
            {/* Map over ALL paths */}
            {pathsConfig.map((path) => {
              const isCurrentlyActive = path.id === activePathId;
              return (
                <div
                  key={path.id}
                  // Adjust width and add styling for active/inactive
                  className={cn(
                    "flex h-full flex-shrink-0 flex-col rounded-lg border p-4 cursor-pointer", // Removed fixed width (w-56) and scrolling classes
                    isCurrentlyActive
                      ? "border-indigo-700 bg-gray-800 opacity-60" // Style for active path in this list
                      : "border-gray-700 bg-gray-800 hover:bg-gray-700/60"
                  )}
                  onClick={() => handleOpenDetailModal(path.id)} // Use the new handler
                >
                  {/* Path Header */}
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <path.icon className="h-5 w-5 text-gray-400" />
                      <h3 className="font-semibold text-gray-300">
                        {path.name}
                      </h3>
                    </div>
                    {/* Add "Active" badge if this path is the active one */}
                    {isCurrentlyActive && (
                      <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="mb-0 text-xs text-gray-400">
                    {" "}
                    {/* Removed flex-grow and adjusted margin */}
                    {path.description}
                  </p>
                  {/* Removed Vertical Reward Preview */}
                  {/* Removed Select Button */}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm Path Switch
            </DialogTitle>
            <DialogDescription className="pt-2">
              Switching from '{activePath?.name || "None"}' to '
              {getPendingPathName()}' will reset your progress (
              {currentPathProgressSparks.toLocaleString()} Sparks) towards the
              next unlock on the current path. Are you sure?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={cancelPathSwitch}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmPathSwitch}>
              Confirm Switch
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Path Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="sm:max-w-lg">
          {" "}
          {/* Adjust max-width as needed */}
          {selectedPath && ( // Render only if a path is selected
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {/* Path Icon and Title */}
                  <selectedPath.icon
                    className="h-6 w-6 flex-shrink-0"
                    style={{ color: selectedPath.color }}
                  />
                  {selectedPath.name}
                </DialogTitle>
                {/* Path Description */}
                <DialogDescription className="pt-2 text-sm text-gray-400">
                  {selectedPath.description}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4 text-sm text-gray-300 overflow-y-auto max-h-[60vh]">
                {" "}
                {/* Added max-height and overflow */}
                <h5 className="text-xs font-medium text-gray-400">Rewards:</h5>
                {/* Vertical Reward List (similar to old card structure) */}
                <ol className="space-y-2">
                  {selectedPath.rewards.map((reward: PathReward) => (
                    <li key={reward.id} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex h-5 w-5 items-center justify-center rounded-full",
                          reward.isPlaceholder ? "bg-gray-600" : "bg-gray-700"
                        )}
                      >
                        {/* Check if reward is unlocked */}
                        {unlockedRewardIds.has(reward.id) ? (
                          <Check className="h-3 w-3 text-white" />
                        ) : (
                          <reward.icon className="h-3 w-3 text-gray-400" />
                        )}
                      </span>
                      <div className="flex flex-col">
                        {" "}
                        {/* Use a flex column to stack name and description */}
                        <span
                          className={cn(
                            "text-xs",
                            reward.isPlaceholder
                              ? "italic text-gray-500"
                              : "text-gray-300"
                          )}
                        >
                          {reward.name}
                          {!reward.isPlaceholder && reward.sparkCost && (
                            <span className="ml-1 text-[10px] text-yellow-400">
                              ({reward.sparkCost.toLocaleString()} Sparks)
                            </span>
                          )}
                        </span>
                        {/* Display description as a subtitle */}
                        {!reward.isPlaceholder && reward.description && (
                          <span className="text-[10px] text-gray-500 mt-0.5">
                            {reward.description}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <DialogFooter className="sm:justify-end">
                {/* Set Active Path Button */}
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full" // Make button full width in modal
                  onClick={() =>
                    selectedPathId && handleSelectPathClick(selectedPathId)
                  } // Use selectedPathId
                  disabled={selectedPathId === activePathId} // Disable if currently active
                >
                  {selectedPathId === activePathId
                    ? "Currently Active"
                    : "Set Active Path"}
                </Button>
                {/* Removed Close button */}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* TODO: Add Modal for Allocate Sparks */}
      {/* Example structure:
       <Dialog open={isAllocateModalOpen} onOpenChange={setIsAllocateModalOpen}>
         <DialogContent>
           <DialogHeader>Allocate Sparks</DialogHeader>
           <Input type="number" ... />
           <DialogFooter>
             <Button onClick={handleAllocateSubmit}>Allocate</Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
       */}
    </div>
  );
}
