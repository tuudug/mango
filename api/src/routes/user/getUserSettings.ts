import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase";

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export const getUserSettings = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase;

  if (!userId || !supabase) {
    res
      .status(401)
      .json({ error: "User not authenticated or Supabase client missing" });
    return;
  }

  try {
    const { data, error, status } = await supabase
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle(); // Use maybeSingle to handle case where settings might not exist yet

    if (error && status !== 406) {
      // 406 is expected if row doesn't exist with maybeSingle
      console.error("[GetUserSettings] Error fetching user settings:", error);
      res.status(500).json({ error: error.message });
      return;
    }

    if (!data) {
      // No settings row found for this user yet, return default-like structure or null
      // Returning null might be simpler for the frontend to check
      console.log(
        `[GetUserSettings] No settings found for user ${userId}, returning null.`
      );
      res.status(200).json(null);
      // Alternatively, return default values:
      // res.status(200).json({
      //   user_id: userId,
      //   notification_permission: 'default',
      //   timezone: null,
      //   created_at: null, // Or omit
      //   updated_at: null  // Or omit
      // });
      return;
    }

    res.status(200).json(data as UserSettings);
  } catch (err) {
    console.error("[GetUserSettings] Unexpected error:", err);
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
