import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
type NotificationPermission = UserSettings["notification_permission"];

// Define expected request body structure
interface UpdateSettingsRequestBody {
  notification_permission?: NotificationPermission;
  // Add other settings here in the future if needed
}

export const updateUserSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase;
  const { notification_permission }: UpdateSettingsRequestBody = req.body;

  if (!userId || !supabase) {
    res
      .status(401)
      .json({ error: "User not authenticated or Supabase client missing" });
    return;
  }

  // Validate input - only allow valid permission values if provided
  if (
    notification_permission &&
    !["granted", "denied", "default"].includes(notification_permission)
  ) {
    res.status(400).json({ error: "Invalid notification_permission value" });
    return;
  }

  // Build the update object dynamically based on provided fields
  const settingsToUpdate: Partial<UserSettings> = {};
  if (notification_permission !== undefined) {
    settingsToUpdate.notification_permission = notification_permission;
  }
  // Add other settings updates here...
  // settingsToUpdate.some_other_setting = req.body.some_other_setting;

  if (Object.keys(settingsToUpdate).length === 0) {
    res.status(400).json({ error: "No valid settings provided for update" });
    return;
  }

  try {
    // Perform an UPSERT operation
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: userId, // Primary key for matching
          ...settingsToUpdate, // Apply the updates
          updated_at: new Date().toISOString(), // Manually set updated_at for upsert
        },
        {
          onConflict: "user_id", // Specify the conflict target
          // defaultToNull is true by default, which is fine here
        }
      )
      .select() // Return the updated/inserted row
      .single();

    if (error) {
      console.error("[UpdateSettings] Error upserting user settings:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json(data as UserSettings);
  } catch (err) {
    console.error("[UpdateSettings] Unexpected error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
