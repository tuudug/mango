import { Response, NextFunction } from "express"; // Import NextFunction
import { AuthenticatedRequest } from "../../middleware/auth"; // Import the extended Request type
import {
  BadRequestError,
  InternalServerError,
  NotFoundError,
} from "../../utils/errors"; // Import custom errors

export const getDashboardLayoutHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next parameter
): Promise<void> => {
  // Re-add check for userId and supabase, critical for type safety and logic
  if (!req.userId || !req.supabase) {
    console.error(
      "getDashboardLayoutHandler Error: userId or supabase client missing from request. Auth middleware might have failed."
    );
    // Pass an InternalServerError because this indicates a server/middleware setup issue
    return next(
      new InternalServerError("Authentication context not found on request.")
    );
  }
  const userId = req.userId; // Now guaranteed by the check above
  const supabase = req.supabase; // Now guaranteed by the check above
  const dashboardName = req.params.name;

  if (!dashboardName) {
    // Throw custom error instead of sending response directly
    return next(new BadRequestError("Dashboard name parameter is required"));
  }

  try {
    const { data, error } = await supabase
      .from("user_dashboard_layouts")
      .select("layout")
      .eq("user_id", userId)
      .eq("name", dashboardName)
      .maybeSingle(); // Use maybeSingle to handle not found gracefully

    if (error) {
      // Throw a generic server error for database issues
      console.error(
        `Supabase error fetching dashboard layout for user ${userId}, name ${dashboardName}:`,
        error
      );
      return next(new InternalServerError("Failed to fetch dashboard layout"));
    }

    // maybeSingle returns null if no row is found
    if (!data) {
      // Explicitly handle not found case - return 200 with null layout
      // This isn't strictly an "error" from the client's perspective,
      // but indicates the resource doesn't exist for this user.
      // We could throw NotFoundError, but the frontend expects null layout on 404/200.
      // Let's stick to the existing behavior of returning 200 with null.
      console.log(
        `Dashboard layout not found for user ${userId}, name ${dashboardName}. Returning null.`
      );
      res.status(200).json({ layout: null });
    } else {
      // Successfully found the layout
      res.status(200).json({ layout: data.layout });
    }
  } catch (err) {
    // Catch any other unexpected errors and pass to the error handler
    console.error("Unexpected error in getDashboardLayoutHandler:", err);
    next(new InternalServerError("An unexpected error occurred"));
  }
};
