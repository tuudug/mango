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
  const [isUpdating, setIsUpdating] = useState(false); // Add state for update process

  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      console.log("Offline ready, setting isChecking to false.");
      setIsChecking(false);
    } else {
      const timer = setTimeout(() => {
        if (!offlineReady) {
          console.log(
            "Timeout reached, assuming no SW or registration failed. Setting isChecking to false."
          );
          setIsChecking(false);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [offlineReady]);

  const handleUpdate = async () => {
    if (!needRefresh || isUpdating) return; // Prevent multiple clicks

    setIsUpdating(true); // Indicate update is in progress

    // Add listener for controller change *before* triggering update
    // Use { once: true } so the listener cleans itself up
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener(
        "controllerchange",
        () => {
          // Reload ONLY after the new worker has taken control
          console.log("Service worker controller changed, reloading page.");
          window.location.reload();
        },
        { once: true }
      );
    }

    try {
      console.log("Calling updateServiceWorker...");
      await updateServiceWorker(true); // Trigger the update
      console.log("updateServiceWorker promise resolved.");
      // Reload is now handled by the 'controllerchange' listener
    } catch (error) {
      console.error("Failed to update service worker:", error);
      setIsUpdating(false); // Reset updating state on error
    }
    // Note: We don't set isUpdating back to false on success,
    // because the page should reload via the listener.
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
  } else if (isUpdating) {
    // Add state for when update is in progress
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
    // No update available (and not checking anymore)
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
                  isDisabled && !isChecking && !isUpdating
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
        </TooltipProvider>{" "}
      </div>{" "}
    </header>
  );
}
