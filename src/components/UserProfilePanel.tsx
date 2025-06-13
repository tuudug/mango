import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
import { useNotificationStore } from "@/stores/notificationStore"; // Import useNotificationStore
import {
  LogOut,
  Settings,
  User,
  X,
  Bell,
  BellOff,
  Loader2,
} from "lucide-react"; // Added Loader2
import { useState, useEffect, useCallback } from "react"; // Added hooks
import { useToastStore } from "@/stores/toastStore"; // Added useToastStore
import { authenticatedFetch } from "@/lib/apiClient"; // Added authenticatedFetch
import { format } from "date-fns"; // Added format

// Helper function to convert VAPID public key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface UserProfilePanelProps {
  onClose: () => void; // Function to close the panel
}

export function UserProfilePanel({ onClose }: UserProfilePanelProps) {
  // Get userSettings from useAuthStore as well
  const { user, session, signOut, userSettings } = useAuthStore();
  const { permissionStatus, requestPermission } = useNotificationStore();
  const { showToast } = useToastStore(); // Corrected function name

  // State for push subscription status
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(true); // Loading initial status
  const [isActionLoading, setIsActionLoading] = useState(false); // Loading subscribe/unsubscribe actions

  // VAPID public key from environment variables (ensure this is set in your .env)
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  // Use user email or a fallback
  const username = user?.email || "User";
  const memberSince = user?.created_at
    ? format(new Date(user.created_at), "MMMM d, yyyy")
    : null;
  // Placeholder data for level/points
  const level = 1;
  const points = 150;

  // --- Push Subscription Logic ---

  // Check current subscription status on mount
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      console.warn("Push notifications not supported by this browser.");
      setIsSubscriptionLoading(false);
      return;
    }

    navigator.serviceWorker.ready
      .then((registration) => {
        return registration.pushManager.getSubscription();
      })
      .then((subscription) => {
        setIsSubscribed(!!subscription);
      })
      .catch((error) => {
        console.error("Error checking push subscription:", error);
        showToast({
          title: "Error checking subscription status",
          variant: "error",
        });
      })
      .finally(() => {
        setIsSubscriptionLoading(false);
      });
  }, [showToast]); // Added showToast dependency

  const subscribeUser = useCallback(async () => {
    if (!vapidPublicKey) {
      console.error("VAPID public key not found. Set VITE_VAPID_PUBLIC_KEY.");
      showToast({
        title: "Configuration error",
        description: "Notification key missing.",
        variant: "error",
      });
      return;
    }
    if (!("serviceWorker" in navigator)) {
      showToast({
        title: "Browser not supported",
        description: "Service workers needed for notifications.",
        variant: "warning",
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSubscription =
        await registration.pushManager.getSubscription();

      if (existingSubscription) {
        console.log("User is already subscribed.");
        setIsSubscribed(true); // Sync state just in case
        showToast({ title: "Already Subscribed", variant: "info" });
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      console.log("User subscribed:", subscription);

      // Send subscription to backend using correct arguments
      // Assuming the backend expects the subscription object directly
      // The function returns the parsed JSON body on success, or throws ApiError
      await authenticatedFetch(
        "/api/user/push-subscriptions", // url
        "POST", // method
        session, // session object
        subscription.toJSON() // body (convert PushSubscription to plain JSON)
      );

      // If authenticatedFetch throws, the catch block below handles it.
      // If it succeeds, we can proceed.
      showToast({ title: "Subscribed to Notifications", variant: "success" });
      setIsSubscribed(true);
    } catch (error) {
      console.error("Failed to subscribe user:", error);
      // Attempt to unsubscribe locally if the backend save failed but local subscription succeeded
      try {
        const registration = await navigator.serviceWorker.ready;
        const currentSubscription =
          await registration.pushManager.getSubscription();
        if (currentSubscription) {
          await currentSubscription.unsubscribe();
          console.log("Cleaned up local subscription after backend failure.");
        }
      } catch (cleanupError) {
        console.error("Error during subscription cleanup:", cleanupError);
      }
      showToast({
        title: "Subscription Failed",
        description: String(error instanceof Error ? error.message : error), // Show error message
        variant: "error",
      });
      setIsSubscribed(false); // Ensure state reflects failure
    } finally {
      setIsActionLoading(false);
    }
  }, [vapidPublicKey, showToast, session]); // Correct dependency array placement

  const unsubscribeUser = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      showToast({
        title: "Browser not supported",
        description: "Service workers needed for notifications.",
        variant: "warning",
      });
      return;
    }
    setIsActionLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        let backendDeletionSuccessful = false;
        try {
          // Send delete request to backend first using correct arguments
          await authenticatedFetch(
            "/api/user/push-subscriptions", // url
            "DELETE", // method
            session, // session object
            { endpoint: subscription.endpoint } // body
          );
          // If it doesn't throw, backend deletion was successful (204 No Content)
          backendDeletionSuccessful = true;
          console.log("Backend subscription deleted successfully.");
        } catch (error) {
          // Check if the error was a 404 (Subscription not found on backend)
          if (error instanceof Error && (error as any).status === 404) {
            console.warn(
              "Subscription not found on backend, proceeding with local unsubscribe."
            );
            backendDeletionSuccessful = true; // Treat as success for local cleanup
          } else {
            // Rethrow other backend errors
            console.error("Failed to delete subscription on server:", error);
            showToast({
              title: "Server Unsubscription Failed",
              description: String(
                error instanceof Error ? error.message : error
              ),
              variant: "error",
            });
            // Do not proceed with local unsubscribe if backend failed unexpectedly
            backendDeletionSuccessful = false;
          }
        }

        // Only unsubscribe locally if backend deletion was successful or ignored (404)
        if (backendDeletionSuccessful) {
          const unsubscribed = await subscription.unsubscribe();
          if (unsubscribed) {
            console.log("User unsubscribed successfully.");
            showToast({
              title: "Unsubscribed from Notifications",
              variant: "success",
            });
            setIsSubscribed(false);
          } else {
            console.error("Failed to unsubscribe locally.");
            showToast({
              title: "Local Unsubscription Failed",
              variant: "error",
            });
          }
        }
        // Removed the 'else' block that handled response.ok/status checks,
        // as errors are now handled by the catch block above.
      } else {
        console.log("No active subscription found to unsubscribe.");
        showToast({ title: "Not Subscribed", variant: "info" });
        setIsSubscribed(false); // Sync state
      }
    } catch (error) {
      console.error("Failed to unsubscribe user:", error);
      showToast({
        title: "Unsubscription Failed",
        description: String(error),
        variant: "error",
      });
    } finally {
      setIsActionLoading(false);
    }
  }, [showToast, session]); // Added session dependency

  // --- End Push Subscription Logic ---

  return (
    <aside className="h-full w-72 bg-gray-800 border-l border-gray-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <div className="flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-100">User Profile</h2>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7"
        >
          <X size={16} />
          <span className="sr-only">Close Panel</span>
        </Button>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Profile Info */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
            <span className="text-4xl">🥭</span>
          </div>
          <h3 className="text-xl font-semibold text-gray-100">{username}</h3>
          {memberSince && (
            <span className="text-sm text-gray-400">
              Member since {memberSince}
            </span>
          )}
          <div className="flex gap-4 text-sm text-gray-400">
            <span>Level: {level}</span>
            <span>{points} pts</span>
          </div>
        </div>

        {/* Notification Status */}
        <div className="p-3 bg-gray-750 rounded-md border border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">
            Notifications
          </h4>
          {permissionStatus === "granted" && (
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center gap-2 text-green-400">
                <Bell size={16} />
                <span>Browser Permission Granted</span>
              </div>
              {/* Push Subscription Button */}
              {isSubscriptionLoading ? (
                <Button size="sm" disabled className="justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Checking Status...
                </Button>
              ) : isSubscribed ? (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={unsubscribeUser}
                  disabled={isActionLoading}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isActionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Unsubscribe Reminders
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="default"
                  onClick={subscribeUser}
                  disabled={isActionLoading || !vapidPublicKey} // Disable if key missing
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isActionLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Subscribe to Reminders
                </Button>
              )}
              {!vapidPublicKey && (
                <p className="text-xs text-red-400 mt-1">
                  Push notification key not configured.
                </p>
              )}
              {/* Display Timezone */}
              <div className="mt-2 pt-2 border-t border-gray-600/50">
                <p className="text-xs text-gray-400">Detected Timezone:</p>
                <p className="text-sm text-gray-200">
                  {userSettings?.timezone ?? "Not set"}
                </p>
              </div>
            </div>
          )}
          {permissionStatus === "denied" && (
            <div className="flex items-center gap-2 text-sm text-red-400">
              <BellOff size={16} />
              <span>Disabled (Check browser settings)</span>
            </div>
          )}
          {permissionStatus === "default" && (
            <div className="flex flex-col gap-2 text-sm text-yellow-400">
              <div className="flex items-center gap-2">
                <BellOff size={16} />
                <span>Not requested</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={requestPermission}
                className="text-yellow-400 border-yellow-400/50 hover:bg-yellow-900/30 hover:text-yellow-300"
              >
                Request Permission
              </Button>
            </div>
          )}
        </div>

        {/* Placeholder Links/Actions */}
        <nav className="space-y-1">
          <Button variant="ghost" className="w-full justify-start gap-2">
            <Settings size={16} /> Account Settings
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-400 hover:text-red-300 hover:bg-red-900/30"
            onClick={signOut}
          >
            <LogOut size={16} /> Log Out
          </Button>
        </nav>

        {/* Add more profile content later */}
      </div>
    </aside>
  );
}
