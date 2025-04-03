import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth"; // Import the extended Request type

export const getDashboardLayoutHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Check if middleware successfully attached userId and supabase client
  if (!req.userId || !req.supabase) {
    console.error(
      "getDashboardLayoutHandler Error: userId or supabase client missing from request. Auth middleware might have failed."
    );
    res.status(500).json({ message: "Internal server error" });
    return;
  }

  const userId = req.userId; // Now guaranteed to be string
  const supabase = req.supabase; // Now guaranteed to be SupabaseClient
  const dashboardName = req.params.name;

  if (!dashboardName) {
    res.status(400).json({ message: "Dashboard name parameter is required" });
    return;
  }

  try {
    // Use the request-scoped Supabase client
    const { data, error, status } = await supabase // Use the validated client
      .from("user_dashboard_layouts")
      .select("layout")
      .eq("user_id", userId)
      .eq("name", dashboardName)
      .maybeSingle();

    if (error) {
      console.error(
        `Error fetching dashboard layout for user ${userId}, name ${dashboardName}:`,
        error
      );
      res.status(status || 500).json({
        message: "Error fetching dashboard layout",
        error: error.message,
      });
      return;
    }

    if (!data) {
      console.log(
        `Dashboard layout not found for user ${userId}, name ${dashboardName}. Returning null.`
      );
      res.status(200).json({ layout: null });
    } else {
      res.status(200).json({ layout: data.layout });
    }
  } catch (err) {
    console.error("Unexpected error in getDashboardLayoutHandler:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
