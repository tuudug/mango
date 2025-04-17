import { Response, NextFunction } from "express"; // Import NextFunction
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  BadRequestError,
  InternalServerError,
  ValidationError, // Use ValidationError for body issues
} from "../../utils/errors"; // Import custom errors

export const upsertDashboardLayoutHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next parameter
): Promise<void> => {
  // Check if middleware successfully attached userId and supabase client
  if (!req.userId || !req.supabase) {
    console.error(
      "upsertDashboardLayoutHandler Error: userId or supabase client missing from request. Auth middleware might have failed."
    );
    // Pass an InternalServerError because this indicates a server/middleware setup issue
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }

  const userId = req.userId; // Now guaranteed
  const supabase = req.supabase; // Now guaranteed
  const dashboardName = req.params.name;
  const { layout } = req.body; // Extract layout from request body

  if (!dashboardName) {
    return next(new BadRequestError("Dashboard name parameter is required"));
  }

  // Basic validation for the layout data
  if (!layout || !Array.isArray(layout)) {
    // Use ValidationError for invalid request body data
    return next(
      new ValidationError("Invalid or missing 'layout' data in request body")
    );
  }
  // Add more specific validation here if needed, throwing ValidationError

  try {
    const { data, error } = await supabase
      .from("user_dashboard_layouts")
      .upsert(
        {
          user_id: userId,
          name: dashboardName,
          layout: layout, // The layout JSON from the request body
          // updated_at is handled by the database trigger
        },
        {
          onConflict: "user_id, name", // Specify conflict target for upsert
        }
      )
      .select("id") // Select something to confirm success
      .single(); // Expecting a single row back after upsert

    if (error) {
      console.error(
        `Supabase error upserting dashboard layout for user ${userId}, name ${dashboardName}:`,
        error
      );
      // Throw InternalServerError for database errors during save
      return next(new InternalServerError("Failed to save dashboard layout"));
    }

    // Log success and send response
    console.log(
      `Successfully upserted dashboard layout for user ${userId}, name ${dashboardName}, id: ${data?.id}`
    );
    res
      .status(200)
      .json({ message: "Layout saved successfully", id: data?.id });
  } catch (err) {
    // Catch any other unexpected errors and pass to the error handler
    console.error("Unexpected error in upsertDashboardLayoutHandler:", err);
    next(new InternalServerError("An unexpected error occurred"));
  }
};
