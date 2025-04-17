import { Response, NextFunction } from "express"; // Add NextFunction
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth"; // Import the correct interface
import { InternalServerError } from "../../utils/errors"; // Import custom error

// Explicitly type the return as Promise<void>
export const getHabits = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next parameter
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client

  if (!userId || !supabase) {
    // Check for client
    console.error(
      "getHabits Error: userId or supabase client missing from request after authentication."
    );
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  try {
    // Use the request-scoped 'supabase' client
    const { data, error } = await supabase
      .from("manual_habits")
      .select("*")
      .eq("user_id", userId) // RLS also enforces this
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching habits:", error);
      return next(new InternalServerError("Failed to fetch habits"));
    }

    res.status(200).json(data || []);
  } catch (err) {
    console.error("Unexpected error fetching habits:", err);
    next(err);
  }
};
