import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase"; // Keep for UserSettings type
import {
  InternalServerError,
  AuthenticationError,
  ValidationError,
  BadRequestError,
} from "../../utils/errors";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];
type NotificationPermission = UserSettings["notification_permission"];

// Define expected request body structure
interface UpdateSettingsRequestBody {
  notification_permission?: NotificationPermission;
  timezone?: string; // Add optional timezone string
  // Add other settings here in the future if needed
}

export const updateUserSettings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const updatePayload: UpdateSettingsRequestBody = req.body;

  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    // Build the update object dynamically based on provided fields and validate
    const settingsToUpdate: Partial<UserSettings> = {};

    if (updatePayload.notification_permission !== undefined) {
      if (
        updatePayload.notification_permission === null ||
        !["granted", "denied", "default"].includes(
          updatePayload.notification_permission as string
        )
      ) {
        return next(
          new ValidationError("Invalid notification_permission value")
        );
      }
      settingsToUpdate.notification_permission =
        updatePayload.notification_permission;
    }

    // Validate and assign timezone
    if (updatePayload.timezone !== undefined) {
      const tzValue = updatePayload.timezone;

      if (tzValue === null) {
        settingsToUpdate.timezone = null; // Handle null case first
      } else if (typeof tzValue === "string") {
        // Handle string case
        settingsToUpdate.timezone = tzValue; // Assign the string
      } else {
        // Handle invalid type case (neither null nor string)
        return next(new ValidationError("Invalid type for timezone"));
      }
    }

    // Check if at least one valid setting was provided
    if (Object.keys(settingsToUpdate).length === 0) {
      return next(new BadRequestError("No valid settings provided for update"));
    }

    // Perform an UPSERT operation
    const { data, error } = await supabase
      .from("user_settings")
      .upsert(
        {
          user_id: userId,
          ...settingsToUpdate,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("Supabase error upserting user settings:", error);
      return next(
        new InternalServerError(
          "Failed to update user settings due to database error."
        )
      );
    }

    // .single() guarantees data if error is null
    res.status(200).json(data as UserSettings);
  } catch (err) {
    // Catch unexpected errors
    console.error("Unexpected error in updateUserSettings handler:", err);
    next(err); // Pass to global error handler
  }
};
