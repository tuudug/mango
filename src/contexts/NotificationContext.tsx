import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { authenticatedFetch } from "../lib/apiClient"; // Assuming apiClient handles auth
import { useAuth } from "./AuthContext"; // To get user session status
import { useToast } from "./ToastContext"; // For user feedback

// Define the shape of a notification based on the backend schema
// (Adjust if necessary based on actual data returned)
export interface AppNotification {
  id: string;
  user_id: string;
  created_at: string;
  type: string;
  title: string | null;
  body: string;
  is_read: boolean;
  read_at: string | null;
  related_entity_id: string | null;
}

type NotificationPermissionStatus = "granted" | "denied" | "default";

interface NotificationContextType {
  permissionStatus: NotificationPermissionStatus;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  requestPermission: () => Promise<void>;
  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const { session } = useAuth();
  const { showToast } = useToast(); // Correct function name
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>("default");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // TODO: Add state to track last fetch time if needed for FetchManager integration

  // Check initial permission status on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermissionStatus(Notification.permission);
      // TODO: Fetch stored permission from user_settings if different?
    }
  }, []);

  // Calculate unread count whenever notifications change
  useEffect(() => {
    const count = notifications.filter((n) => !n.is_read).length;
    setUnreadCount(count);
  }, [notifications]);

  const updateStoredPermission = useCallback(
    async (status: NotificationPermissionStatus) => {
      if (!session) return; // Need to be logged in
      try {
        // Call the backend endpoint to save the permission status
        await authenticatedFetch(
          "/api/user/settings", // The endpoint we just created
          "PUT",
          session,
          { notification_permission: status } // Send the status in the body
        );
        console.log(
          `[NotificationContext] Stored notification permission status: ${status}`
        );
      } catch (error) {
        console.error(
          "[NotificationContext] Failed to update stored permission:",
          error
        );
        showToast({
          // Use showToast with object argument
          title: "Error",
          description:
            "Failed to save notification preference. Please try again.",
          variant: "error",
        });
      }
    },
    [session, showToast] // Correct dependency
  );

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      showToast({
        // Use showToast with object argument
        title: "Unsupported",
        description: "Browser does not support notifications.",
        variant: "warning",
      });
      return;
    }

    if (permissionStatus !== "default") {
      showToast({
        // Use showToast with object argument
        title: "Permission Set",
        description: `Notification permission is already ${permissionStatus}. Check browser settings to change.`,
        variant: "info",
      });
      return;
    }

    try {
      const status = await Notification.requestPermission();
      setPermissionStatus(status);
      showToast({
        // Use showToast with object argument
        title: "Permission Update",
        description: `Notification permission ${status}.`,
        variant: "success",
      });
      // Update the backend
      await updateStoredPermission(status);
    } catch (error) {
      console.error(
        "[NotificationContext] Error requesting permission:",
        error
      );
      showToast({
        // Use showToast with object argument
        title: "Error",
        description: "Failed to request notification permission.",
        variant: "error",
      });
    }
  }, [permissionStatus, showToast, updateStoredPermission]); // Update dependency array

  const fetchNotifications = useCallback(
    async (force?: boolean) => {
      // TODO: Integrate with FetchManagerContext cooldown logic if needed
      if (!session) return; // Only fetch if logged in
      setIsLoading(true);
      console.log("[NotificationContext] Fetching notifications...");
      try {
        const data: AppNotification[] = await authenticatedFetch(
          // Add method and session
          "/api/notifications",
          "GET",
          session
        ); // Fetch all initially
        setNotifications(data || []);
        console.log(
          "[NotificationContext] Fetched notifications:",
          data?.length ?? 0
        );
      } catch (error) {
        console.error(
          "[NotificationContext] Failed to fetch notifications:",
          error
        );
        showToast({
          // Use showToast with object argument
          title: "Error",
          description: "Could not load notifications.",
          variant: "error",
        });
        setNotifications([]); // Clear on error
      } finally {
        setIsLoading(false);
      }
    },
    [session, showToast] // Update dependency array
  );

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!session) return;
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      ); // Optimistic update
      try {
        await authenticatedFetch(
          // Add method and session
          `/api/notifications/${notificationId}/read`,
          "PUT",
          session
        );
        // No need to re-fetch, optimistic update handles UI
      } catch (error) {
        console.error("[NotificationContext] Failed to mark as read:", error);
        showToast({
          // Use showToast with object argument
          title: "Error",
          description: "Failed to update notification status.",
          variant: "error",
        });
        // Revert optimistic update on error
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: false } : n
          )
        );
      }
    },
    [session, showToast] // Update dependency array
  );

  const markAllAsRead = useCallback(async () => {
    if (!session) return;
    const currentlyUnread = notifications.filter((n) => !n.is_read);
    if (currentlyUnread.length === 0) return; // Nothing to mark

    const originalNotifications = [...notifications]; // Store original state for potential revert
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true }))); // Optimistic update

    try {
      await authenticatedFetch(
        // Add method and session
        "/api/notifications/read-all",
        "PUT",
        session
      );
      // No need to re-fetch
    } catch (error) {
      console.error("[NotificationContext] Failed to mark all as read:", error);
      showToast({
        // Use showToast with object argument
        title: "Error",
        description: "Failed to update notification statuses.",
        variant: "error",
      });
      // Revert optimistic update on error
      setNotifications(originalNotifications);
    }
  }, [session, notifications, showToast]); // Update dependency array

  const value = {
    permissionStatus,
    notifications,
    unreadCount,
    isLoading,
    requestPermission,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
