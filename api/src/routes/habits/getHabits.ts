import { Response } from "express";
// import { supabase } from "../../supabaseClient"; // Remove global import
import { AuthenticatedRequest } from "../../middleware/auth"; // Import the correct interface

// Explicitly type the return as Promise<void>
export const getHabits = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase; // Use request-scoped client

  if (!userId || !supabase) {
    // Check for client
    console.error(
      "getHabits Error: userId or supabase client missing from request after authentication."
    );
    res
      .status(401)
      .json({
        error: "User not authenticated properly or Supabase client missing",
      });
    return;
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
      res.status(500).json({ error: error.message });
      return; // Return void explicitly here
    }

    res.status(200).json(data || []);
    // Implicitly returns void here
  } catch (err) {
    console.error("Unexpected error fetching habits:", err);
    res.status(500).json({ error: "Internal server error" });
    // Implicitly returns void here
  }
};
