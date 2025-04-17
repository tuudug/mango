import { Request, Response, NextFunction } from "express"; // Import NextFunction
// No need for AuthenticatedRequest import due to module augmentation in express.d.ts
import { supabase } from "../../supabaseClient";
import { InternalServerError } from "../../utils/errors"; // Import custom errors

export const getHealthSettings = async (
  req: Request,
  res: Response,
  next: NextFunction // Add next parameter
) => {
  // Removed explicit Promise<void> return type
  // Return type is implicitly void due to return statements after res.json()
  const user = req.user; // req.user is augmented by express.d.ts

  if (!user || !user.id) {
    // Also check user.id for safety
    // Use next with custom error for server/middleware issues
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  try {
    const { data, error } = await supabase
      .from("manual_health_settings")
      .select("daily_steps_goal, weight_goal") // Select both goals
      .eq("user_id", user.id) // Use user.id from the check above
      .maybeSingle(); // Use maybeSingle to handle case where no settings exist yet

    if (error) {
      console.error(
        `Supabase error fetching health settings for user ${user.id}:`,
        error
      );
      return next(new InternalServerError("Failed to fetch health settings"));
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
    // No explicit return needed here
  } catch (err) {
    console.error("Unexpected error fetching health settings:", err);
    next(err); // Pass error to global handler
  }
};
