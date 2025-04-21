import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, DownloadCloud, Sparkles as SparkIcon } from "lucide-react"; // Import Bell, DownloadCloud, and Sparkle icons
import { useNotification } from "@/contexts/NotificationContext"; // Import notification hook
import { useSparks } from "@/contexts/SparksContext"; // Import useSparks hook
import { useFetchManager } from "@/contexts/FetchManagerContext"; // Import FetchManager hook
import { formatDistanceToNow } from "date-fns"; // Import formatDistanceToNow
// Removed NotificationsPanel import
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, RefreshCw } from "lucide-react";
import changelogData from "../../public/changelog.json";
import { cn } from "@/lib/utils"; // Import cn utility

const latestVersion =
  changelogData && changelogData.length > 0
    ? changelogData[0].version
    : "?.?.?";

// Define props for the header, including PWA update props AND notification toggle
interface DashboardHeaderProps {
  updateSW: () => void;
  needRefresh: boolean;
  onToggleNotifications: () => void; // Add prop to toggle panel in parent
}

export function DashboardHeader({
  updateSW,
  needRefresh,
  onToggleNotifications, // Destructure new prop
}: DashboardHeaderProps) {
  // Accept props
  const [isUpdating, setIsUpdating] = useState(false); // Keep state for update process
  const { unreadCount } = useNotification(); // Get notification count
  // Removed isNotificationsOpen state

  const { totalSparks } = useSparks(); // Get totalSparks from context
  const {
    lastFetchTimestamp,
    triggerGlobalFetch,
    isFetching: isFetchingData,
  } = useFetchManager(); // Get fetch manager state and function

  const handleUpdate = async () => {
    if (!needRefresh || isUpdating) return; // Prevent multiple clicks

    setIsUpdating(true); // Indicate update is in progress

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          console.log("Service worker controller changed, reloading page.");
          window.location.reload();
        },
        { once: true }
      );
    }

    try {
      console.log("Calling updateSW prop function...");
      updateSW();
      console.log("updateSW prop function called.");
    } catch (error) {
      console.error("Failed to trigger service worker update:", error);
      setIsUpdating(false); // Reset updating state on error
    }
  };

  // Determine button state and content based on props
  let buttonIcon = <RefreshCw className="h-4 w-4" />;
  let tooltipContent = "No updates available";
  let ariaLabel = "No updates available";
  let isDisabled = true;
  let showIndicator = false;
  let pulseAnimation = "";

  if (isUpdating) {
    buttonIcon = <Loader2 className="h-5 w-5 animate-spin" />;
    tooltipContent = "Updating...";
    ariaLabel = "Updating application...";
    isDisabled = true;
  } else if (needRefresh) {
    tooltipContent = "Update available";
    ariaLabel = "Update available";
    isDisabled = false;
    showIndicator = true;
    pulseAnimation = "animate-pulse";
  } else {
    tooltipContent = "Up to date";
    ariaLabel = "Up to date";
    isDisabled = true;
  }

  return (
    <header className="bg-gray-800 border-b border-gray-700 shadow-sm flex items-center z-10 py-0.5">
      {" "}
      {/* Reduced py-2 to py-1 */}
      {/* Left side: Title and Version */}
      <div className="flex items-baseline gap-2 flex-shrink-0 pl-6">
        {" "}
        {/* Added flex-shrink-0 and pl-6 */}
        <p className="font-semibold text-gray-100 text-sm">Mango</p>{" "}
        {/* Removed text-xl */}
        <span className="text-[10px] font-mono text-gray-500">
          {" "}
          {/* Changed text-xs to text-[10px] */}v{latestVersion}
        </span>
      </div>
      {/* Center: Spark Balance Display */}
      <div className="flex-grow flex justify-center items-center">
        {" "}
        {/* Added flex-grow and centering */}
        <div className="flex items-center gap-1 text-sm font-medium text-yellow-300">
          {" "}
          {/* Adjusted styling */}
          <SparkIcon className="h-4 w-4" fill="currentColor" />{" "}
          {/* Spark Icon */}
          <span>{totalSparks.toLocaleString()}</span>{" "}
          {/* Display total sparks */}
        </div>
      </div>
      {/* Right side: Buttons */}
      <div className="flex items-center gap-1 flex-shrink-0 pr-4">
        {" "}
        {/* Reduced gap, added flex-shrink-0 and pr-4 */}
        {/* Manual Fetch Button */}
        <div className="relative">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative p-2 text-gray-400 hover:text-white bg-transparent hover:ring-0 hover:bg-gray-700/50",
                    isFetchingData ? "animate-spin" : ""
                  )}
                  onClick={() => triggerGlobalFetch(true)} // Force fetch
                  title="Manual Fetch"
                  disabled={isFetchingData} // Disable while fetching
                  aria-label="Manual Fetch"
                >
                  <DownloadCloud className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {lastFetchTimestamp
                  ? `Last fetched: ${formatDistanceToNow(lastFetchTimestamp, {
                      addSuffix: true,
                    })}`
                  : "Never fetched"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Update Button */}
        <div className="relative">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={handleUpdate}
                  disabled={isDisabled}
                  className={cn(
                    "relative p-2 text-gray-400 hover:text-white bg-transparent hover:ring-0 hover:bg-gray-700/50",
                    pulseAnimation,
                    isDisabled && !isUpdating
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  )}
                  aria-label={ariaLabel}
                >
                  {buttonIcon}
                  {showIndicator && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{tooltipContent}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        {/* Notification Button */}
        <div className="relative">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  onClick={onToggleNotifications}
                  className="relative p-2 text-gray-400 hover:text-white bg-transparent hover:ring-0 hover:bg-gray-700/50"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-1 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notifications</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* REMOVED Conditional Rendering of NotificationsPanel */}
    </header>
  );
}
