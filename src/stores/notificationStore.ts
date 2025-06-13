import { create } from 'zustand';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import { authenticatedFetch } from '@/lib/apiClient';

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

export type NotificationPermissionStatus = "granted" | "denied" | "default";

interface NotificationState {
  permissionStatus: NotificationPermissionStatus;
  notifications: AppNotification[];
  unreadCount: number;
  isLoading: boolean;
  initPermissionStatus: () => void;
  requestPermission: () => Promise<void>;
  fetchNotifications: (force?: boolean) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  _updateStoredPermission: (status: NotificationPermissionStatus) => Promise<void>;
  _recalculateUnreadCount: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  permissionStatus: 'default',
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  _recalculateUnreadCount: () => {
    set(state => ({ unreadCount: state.notifications.filter(n => !n.is_read).length }));
  },

  initPermissionStatus: () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      set({ permissionStatus: Notification.permission as NotificationPermissionStatus });
    }
  },

  _updateStoredPermission: async (status: NotificationPermissionStatus) => {
    const session = useAuthStore.getState().session;
    if (!session) return;
    try {
      await authenticatedFetch(
        "/api/user/settings",
        "PUT",
        session,
        { notification_permission: status }
      );
      console.log(`[NotificationStore] Stored notification permission status: ${status}`);
    } catch (error) {
      console.error("[NotificationStore] Failed to update stored permission:", error);
      useToastStore.getState().showToast({
        title: "Error",
        description: "Failed to save notification preference. Please try again.",
        variant: "error",
      });
    }
  },

  requestPermission: async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      useToastStore.getState().showToast({
        title: "Unsupported",
        description: "Browser does not support notifications.",
        variant: "warning",
      });
      return;
    }

    const currentStatus = get().permissionStatus;
    if (currentStatus !== "default") {
      useToastStore.getState().showToast({
        title: "Permission Set",
        description: `Notification permission is already ${currentStatus}. Check browser settings to change.`,
        variant: "info",
      });
      return;
    }

    try {
      const status = await Notification.requestPermission();
      set({ permissionStatus: status });
      useToastStore.getState().showToast({
        title: "Permission Update",
        description: `Notification permission ${status}.`,
        variant: "success", // Changed to success for a positive action
      });
      await get()._updateStoredPermission(status);
    } catch (error) {
      console.error("[NotificationStore] Error requesting permission:", error);
      useToastStore.getState().showToast({
        title: "Error",
        description: "Failed to request notification permission.",
        variant: "error",
      });
    }
  },

  fetchNotifications: async (_force?: boolean) => {
    const session = useAuthStore.getState().session;
    if (!session) return;
    set({ isLoading: true });
    console.log("[NotificationStore] Fetching notifications...");
    try {
      const data: AppNotification[] = await authenticatedFetch(
        "/api/notifications",
        "GET",
        session
      );
      set({ notifications: data || [], isLoading: false });
      get()._recalculateUnreadCount();
      console.log("[NotificationStore] Fetched notifications:", data?.length ?? 0);
    } catch (error) {
      console.error("[NotificationStore] Failed to fetch notifications:", error);
      useToastStore.getState().showToast({
        title: "Error",
        description: "Could not load notifications.",
        variant: "error",
      });
      set({ notifications: [], isLoading: false });
      get()._recalculateUnreadCount();
    }
  },

  markAsRead: async (notificationId: string) => {
    const session = useAuthStore.getState().session;
    if (!session) return;

    const originalNotifications = get().notifications;
    set(state => ({
      notifications: state.notifications.map((n) =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ),
    }));
    get()._recalculateUnreadCount(); // Recalculate after optimistic update

    try {
      await authenticatedFetch(
        `/api/notifications/${notificationId}/read`,
        "PUT",
        session
      );
    } catch (error) {
      console.error("[NotificationStore] Failed to mark as read:", error);
      useToastStore.getState().showToast({
        title: "Error",
        description: "Failed to update notification status.",
        variant: "error",
      });
      set({ notifications: originalNotifications }); // Revert
      get()._recalculateUnreadCount(); // Recalculate after revert
    }
  },

  markAllAsRead: async () => {
    const session = useAuthStore.getState().session;
    if (!session) return;

    const originalNotifications = get().notifications;
    if (originalNotifications.filter(n => !n.is_read).length === 0) return;


    set(state => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
    }));
    get()._recalculateUnreadCount();

    try {
      await authenticatedFetch(
        "/api/notifications/read-all",
        "PUT",
        session
      );
    } catch (error) {
      console.error("[NotificationStore] Failed to mark all as read:", error);
      useToastStore.getState().showToast({
        title: "Error",
        description: "Failed to update notification statuses.",
        variant: "error",
      });
      set({ notifications: originalNotifications }); // Revert
      get()._recalculateUnreadCount();
    }
  },
}));

// Initialize permission status when store is created/loaded
useNotificationStore.getState().initPermissionStatus();

// Subscribe to auth changes to fetch notifications
let currentAuthSessionNotifToken = useAuthStore.getState().session?.access_token;

useAuthStore.subscribe(
  (newSession) => {
    const { fetchNotifications } = useNotificationStore.getState();
    const newAuthSessionNotifToken = newSession?.access_token;

    if (newAuthSessionNotifToken && !currentAuthSessionNotifToken) { // User signed in
      console.log("[NotificationStore] Auth session detected (sign in), fetching initial notifications...");
      fetchNotifications();
    } else if (!newAuthSessionNotifToken && currentAuthSessionNotifToken) { // User signed out
      console.log("[NotificationStore] Auth session removed (sign out), clearing notifications...");
      useNotificationStore.setState({ notifications: [], unreadCount: 0, isLoading: false });
    } else if (newAuthSessionNotifToken && newAuthSessionNotifToken !== currentAuthSessionNotifToken) { // Session refreshed
        console.log("[NotificationStore] Auth session refreshed, fetching notifications...");
        fetchNotifications();
    }
    currentAuthSessionNotifToken = newAuthSessionNotifToken;
  },
  (state) => state.session // Subscribe only to session changes
);

// Initial fetch if session already exists on load
if (currentAuthSessionNotifToken) {
  console.log("[NotificationStore] Initial auth session present on load, fetching notifications...");
  useNotificationStore.getState().fetchNotifications();
}
