import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { useNotification } from "@/contexts/NotificationContext"; // Import useNotification
import { LogOut, Settings, User, X, Bell, BellOff } from "lucide-react"; // Import Bell icons

interface UserProfilePanelProps {
  onClose: () => void; // Function to close the panel
}

export function UserProfilePanel({ onClose }: UserProfilePanelProps) {
  const { user, signOut } = useAuth(); // Get user and signOut function
  const { permissionStatus, requestPermission } = useNotification(); // Get notification status and request function

  // Use user email or a fallback
  const username = user?.email || "User";
  // Placeholder data for level/points
  const level = 1;
  const points = 150;

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
            <div className="flex items-center gap-2 text-sm text-green-400">
              <Bell size={16} />
              <span>Enabled</span>
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
