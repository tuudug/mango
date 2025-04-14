import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react"; // Import Bell icon
import { useNotification } from "@/contexts/NotificationContext"; // Import notification hook
// Removed NotificationsPanel import
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, RefreshCw } from "lucide-react";
import changelogData from "../../public/changelog.json";

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
  let buttonIcon = <RefreshCw className="h-5 w-5" />;
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
    <header className="pr-4 py-4 bg-gray-800 border-b border-gray-700 shadow-sm flex justify-between items-center z-10">
      {/* Left side: Title and Version */}
      <div className="flex items-baseline gap-2">
        <h1 className="pl-6 text-2xl font-bold text-gray-100">Mango</h1>
        <span className="text-xs font-mono text-gray-500">
          v{latestVersion}
        </span>
      </div>
      {/* Right side: Buttons */}
      <div className="flex items-center gap-2">
        {/* Update Button */}
        <div className="relative">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleUpdate}
                  disabled={isDisabled}
                  className={`relative ${pulseAnimation} ${
                    isDisabled && !isUpdating
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
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
                  size="icon"
                  onClick={onToggleNotifications} // Call prop function
                  className="relative text-gray-400 hover:text-white"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-gray-800" />
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
