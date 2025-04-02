import { useRegisterSW } from "virtual:pwa-register/react"; // Use virtual module import
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
// Import the changelog data
import changelogData from "../../public/changelog.json"; // Corrected import path

// Get the latest version from the changelog (first entry)
// Add a fallback in case the file is empty or malformed
const latestVersion =
  changelogData && changelogData.length > 0
    ? changelogData[0].version
    : "?.?.?";

export function DashboardHeader() {
  const {
    offlineReady: [_offlineReady, _setOfflineReady], // Prefixed unused variables
    needRefresh: [needRefresh, _setNeedRefresh], // Prefixed unused setNeedRefresh
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl: string, r: ServiceWorkerRegistration | undefined) {
      // Added types
      console.log(`SW registered: ${swUrl}`);
      // Optional: Add logic if needed when SW is first registered
      // You might want to use 'r' (registration) here if needed later
      if (r) {
        console.log("Service Worker Registration:", r);
      }
    },
    onRegisterError(error: Error) {
      // Added type
      console.error("SW registration error:", error);
    },
  });

  const handleUpdate = () => {
    // Prevent action if not ready for refresh
    if (!needRefresh) return;
    // Passing true skips the waiting phase
    updateServiceWorker(true);
    // Reload the page to apply the update
    window.location.reload();
  };

  return (
    <header className="pr-4 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex justify-between items-center z-10">
      {/* Left side: Title and Version */}
      <div className="flex items-baseline gap-2">
        <h1 className="pl-6 text-2xl font-bold text-gray-800 dark:text-gray-100">
          Mango
        </h1>
        {/* Display the dynamically loaded version */}
        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
          v{latestVersion}
        </span>
      </div>

      {/* Right side: Update Button */}
      <div className="relative">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            {/* Added asChild back */}
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleUpdate}
                // Removed disabled prop, handle visual state with classes
                className={`relative ${
                  needRefresh
                    ? "animate-pulse"
                    : "opacity-50 cursor-not-allowed" // Conditional classes for visual disabling
                }`}
                aria-label={
                  needRefresh ? "Update available" : "No updates available"
                }
                // Removed inline style
              >
                <RefreshCw className="h-5 w-5" />
                {needRefresh && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{needRefresh ? "Update available" : "No updates available"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </header>
  );
}
