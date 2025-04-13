import { Request, Response } from "express";
// No need for AuthenticatedRequest import due to module augmentation in express.d.ts
import { supabase } from "../../supabaseClient";

export const getHealthSettings = async (req: Request, res: Response) => {
  // Removed explicit Promise<void> return type
  // Return type is implicitly void due to return statements after res.json()
  const user = req.user; // req.user is augmented by express.d.ts

  if (!user || !user.id) {
    // Also check user.id for safety
    res.status(401).json({ message: "User not authenticated" });
    return; // Explicit return after sending response
  }

  try {
    const { data, error } = await supabase
      .from("manual_health_settings")
      .select("daily_steps_goal, weight_goal") // Select both goals
      .eq("user_id", user.id) // Use user.id from the check above
      .maybeSingle(); // Use maybeSingle to handle case where no settings exist yet

    if (error) {
      console.error("Error fetching health settings:", error);
      res.status(500).json({
        message: "Failed to fetch health settings",
        error: error.message,
      });
      return; // Explicit return after sending response
    }

    // If no settings found for the user, return defaults (null for weight goal initially)
    const settings = data
      ? {
          daily_steps_goal: data.daily_steps_goal ?? 10000, // Default if null in DB
          weight_goal: data.weight_goal, // Can be null
        }
      : {
          daily_steps_goal: 10000,
          weight_goal: null, // Default weight goal is null
        };

    res.status(200).json(settings);
    return; // Ensure void return type for handler
  } catch (err) {
    console.error("Unexpected error fetching health settings:", err);
    const message =
      err instanceof Error ? err.message : "An unexpected error occurred";
    res
      .status(500)
      .json({ message: "Failed to fetch health settings", error: message });
    return; // Ensure void return type for handler
  }
};
