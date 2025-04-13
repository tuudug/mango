import { Request, Response, NextFunction } from "express"; // Add NextFunction
// We need the request-scoped client for RLS, not the global one for this operation.
// import { supabase } from "../../supabaseClient";

// Keep explicit Promise<void> return type, but remove RequestHandler cast
export const upsertHealthSettings = async (
  req: Request,
  res: Response,
  next: NextFunction // Add next parameter
): Promise<void> => {
  // Add explicit Promise<void>
  const user = req.user;

  if (!user || !user.id) {
    // Also check user.id
    res.status(401).json({ message: "User not authenticated" });
    return; // Ensure return is separate
  }

  const { daily_steps_goal, weight_goal } = req.body; // Extract weight_goal

  // Validate input
  if (
    typeof daily_steps_goal !== "number" ||
    !Number.isInteger(daily_steps_goal) ||
    daily_steps_goal < 0
  ) {
    res.status(400).json({
      message:
        "Invalid input: daily_steps_goal must be a non-negative integer.",
    });
    return; // Explicit return after sending response
  }

  // Validate weight_goal: must be null or a positive number
  if (
    weight_goal !== null &&
    (typeof weight_goal !== "number" || weight_goal <= 0)
  ) {
    res.status(400).json({
      message: "Invalid input: weight_goal must be null or a positive number.",
    });
    return; // Explicit return after sending response
  }

  try {
    // Use the request-scoped Supabase client for RLS
    const supabaseUserClient = (req as any).supabase;
    if (!supabaseUserClient) {
      // This should ideally not happen if ensureAuthenticated middleware is working
      res.status(500).json({ message: "Supabase client not found on request" });
      return; // Ensure return is separate
    }
    const { error } = await supabaseUserClient
      .from("manual_health_settings")
      .upsert(
        {
          user_id: user.id,
          daily_steps_goal: daily_steps_goal,
          weight_goal: weight_goal, // Add weight_goal to upsert data
          // created_at and updated_at are handled by defaults/triggers
        },
        {
          onConflict: "user_id", // Specify the constraint column for conflict detection
          // Deprecated: ignoreDuplicates: false // Default behavior is update on conflict
        }
      )
      .select(); // Add select() to potentially return the upserted row if needed, though not strictly necessary here

    if (error) {
      console.error("Error upserting health settings:", error);
      // Check for specific errors if needed, e.g., foreign key violation (though unlikely here)
      res.status(500).json({
        message: "Failed to update health settings",
        error: error.message,
      });
      return; // Explicit return after sending response
    }

    res.status(200).json({ message: "Health settings updated successfully." });
    return; // Ensure void return type for handler
  } catch (err) {
    // Pass error to the next middleware (global error handler)
    console.error("Error in upsertHealthSettings:", err);
    next(err);
  }
};
