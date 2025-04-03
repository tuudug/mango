import { useState, useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import changelogData from "../../public/changelog.json";

const latestVersion =
  changelogData && changelogData.length > 0
    ? changelogData[0].version
    : "?.?.?";

export function DashboardHeader() {
  const [isChecking, setIsChecking] = useState(true);

  // Simplify the hook call - remove callbacks
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW(); // Removed options object

  // Use useEffect to set isChecking based on offlineReady state
  // Also handle the case where registration might fail implicitly
  // by setting a timeout. If offlineReady isn't true after a delay,
  // assume something went wrong or there's no SW active.
  useEffect(() => {
    if (offlineReady) {
      console.log("Offline ready, setting isChecking to false.");
      setIsChecking(false);
    } else {
      // Fallback: If not offlineReady after a short delay, stop checking
      const timer = setTimeout(() => {
        // Check again inside timeout in case it became ready just before timeout fired
        if (!offlineReady) {
          console.log(
            "Timeout reached, assuming no SW or registration failed. Setting isChecking to false."
          );
          setIsChecking(false);
        }
      }, 5000); // Wait 5 seconds

      return () => clearTimeout(timer); // Cleanup timer on unmount or if offlineReady changes
    }
  }, [offlineReady]);

  const handleUpdate = async () => {
    if (!needRefresh) return;
    try {
      await updateServiceWorker(true);
      window.location.reload();
    } catch (error) {
      console.error("Failed to update service worker:", error);
    }
  };

  // Determine button state and content
  let buttonIcon = <RefreshCw className="h-5 w-5" />;
  let tooltipContent = "No updates available";
  let ariaLabel = "No updates available";
  let isDisabled = true;
  let showIndicator = false;
  let pulseAnimation = "";

  if (isChecking) {
    buttonIcon = <Loader2 className="h-5 w-5 animate-spin" />;
    tooltipContent = "Checking for updates...";
    ariaLabel = "Checking for updates...";
    isDisabled = true;
  } else if (needRefresh) {
    tooltipContent = "Update available";
    ariaLabel = "Update available";
    isDisabled = false;
    showIndicator = true;
    pulseAnimation = "animate-pulse";
  } else {
    // No update available (and not checking anymore)
    tooltipContent = "Up to date"; // Changed tooltip for clarity
    ariaLabel = "Up to date";
    isDisabled = true;
  }

  return (
    <header className="pr-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center z-10">
      {/* Left side: Title and Version */}
      <div className="flex items-baseline gap-2">
        <h1 className="pl-6 text-2xl font-bold text-gray-800 dark:text-gray-100">
          Mango
        </h1>
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          v{latestVersion}
        </span>
      </div>
      {/* Right side: Update Button */}
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
                  isDisabled && !isChecking
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                aria-label={ariaLabel}
              >
                {buttonIcon}
                {showIndicator && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{tooltipContent}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>{" "}
      </div>{" "}
    </header>
  );
}
