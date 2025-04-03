import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

export const upsertDashboardLayoutHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  // Check if middleware successfully attached userId and supabase client
  if (!req.userId || !req.supabase) {
    console.error(
      "upsertDashboardLayoutHandler Error: userId or supabase client missing from request. Auth middleware might have failed."
    );
    res.status(500).json({ message: "Internal server error" });
    return;
  }

  const userId = req.userId;
  const supabase = req.supabase;
  const dashboardName = req.params.name;
  const { layout } = req.body; // Extract layout from request body

  if (!dashboardName) {
    res.status(400).json({ message: "Dashboard name parameter is required" });
    return;
  }

  // Basic validation for the layout data
  if (!layout || !Array.isArray(layout)) {
    res
      .status(400)
      .json({ message: "Invalid or missing 'layout' data in request body" });
    return;
  }
  // Add more specific validation if needed (e.g., check item structure)

  try {
    const { data, error, status } = await supabase
      .from("user_dashboard_layouts")
      .upsert(
        {
          user_id: userId,
          name: dashboardName,
          layout: layout, // The layout JSON from the request body
          // updated_at is handled by the trigger
        },
        {
          onConflict: "user_id, name", // Specify conflict target for upsert
          // defaultToNull: false, // Ensure existing non-updated columns aren't nulled (usually default)
        }
      )
      .select("id") // Select something to confirm success
      .single(); // Expecting a single row back after upsert

    if (error) {
      console.error(
        `Error upserting dashboard layout for user ${userId}, name ${dashboardName}:`,
        error
      );
      res
        .status(status || 500)
        .json({
          message: "Error saving dashboard layout",
          error: error.message,
        });
      return;
    }

    console.log(
      `Successfully upserted dashboard layout for user ${userId}, name ${dashboardName}, id: ${data?.id}`
    );
    res
      .status(200)
      .json({ message: "Layout saved successfully", id: data?.id });
  } catch (err) {
    console.error("Unexpected error in upsertDashboardLayoutHandler:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
