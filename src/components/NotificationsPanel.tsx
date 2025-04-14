import React from "react";
// Removed duplicate import
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Import Tooltip components
import { X, BellOff, CheckCheck } from "lucide-react";
import {
  useNotification,
  AppNotification,
} from "@/contexts/NotificationContext";
import { formatDistanceToNow } from "date-fns"; // For relative time

interface NotificationsPanelProps {
  onClose: () => void;
}

export function NotificationsPanel({ onClose }: NotificationsPanelProps) {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotification();

  const handleMarkAllRead = () => {
    if (unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <aside className="h-full w-full max-w-sm bg-gray-800 border-l border-gray-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex justify-between items-center flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-100">Notifications</h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || isLoading}
            title="Mark all as read"
            className="text-gray-400 hover:text-white disabled:text-gray-600"
          >
            <CheckCheck size={16} className="mr-1" /> Mark all read
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-gray-400 hover:text-white"
            onClick={onClose}
            title="Close Notifications"
          >
            <X size={16} />
          </Button>
        </div>
      </div>

      {/* Notification List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {isLoading && notifications.length === 0 && (
            <p className="text-gray-400 text-center py-4">Loading...</p>
          )}
          {!isLoading && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center text-gray-500 py-10">
              <BellOff size={40} className="mb-2" />
              <p>No notifications yet.</p>
            </div>
          )}
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={markAsRead}
            />
          ))}
        </div>
      </ScrollArea>
    </aside>
  );
}

// --- Sub-component for individual notification item ---
interface NotificationItemProps {
  notification: AppNotification;
  onMarkRead: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkRead,
}) => {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <div
      className={`p-3 rounded-md flex items-start gap-3 ${
        notification.is_read
          ? "bg-gray-750 opacity-70"
          : "bg-gray-700 hover:bg-gray-650"
      }`}
    >
      <div className="flex-1 space-y-1">
        {/* Optional Title can go here */}
        {/* {notification.title && <p className="text-sm font-medium text-gray-100">{notification.title}</p>} */}
        <p className="text-sm text-gray-300">{notification.body}</p>
        <p className="text-xs text-gray-400">{timeAgo}</p>
      </div>
      {!notification.is_read && (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0 text-gray-400 hover:text-blue-400"
                onClick={() => onMarkRead(notification.id)}
                title="Mark as read"
              >
                <CheckCheck size={14} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Mark as read</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
};
