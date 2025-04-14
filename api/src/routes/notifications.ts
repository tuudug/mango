import express, { Response } from "express"; // Removed Request import as it's part of AuthenticatedRequest
import { ensureAuthenticated, AuthenticatedRequest } from "../middleware/auth"; // Correct import
// Removed global supabase import, will use req.supabase
import { Database } from "../types/supabase";

type Notification = Database["public"]["Tables"]["notifications"]["Row"];

const router = express.Router();

// GET /api/notifications - Fetch notifications for the logged-in user
router.get(
  "/",
  ensureAuthenticated,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Add return type
    // Use ensureAuthenticated and AuthenticatedRequest
    const userId = req.userId; // Use req.userId
    if (!userId || !req.supabase) {
      // Check for req.supabase as well
      res // Remove return
        .status(401)
        .json({ error: "User not authenticated or Supabase client missing" });
      return; // Add simple return to exit function
    }

    const { read } = req.query; // Optional query param: ?read=true or ?read=false

    try {
      let query = req.supabase // Use req.supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (read === "true") {
        query = query.eq("is_read", true);
      } else if (read === "false") {
        query = query.eq("is_read", false);
      }

      const { data, error } = await query;

      if (error) {
        console.error(
          "[NotificationsRoute] Error fetching notifications:",
          error
        );
        res.status(500).json({ error: error.message }); // Remove return
        return; // Add simple return
      }

      res.status(200).json(data as Notification[]); // This one is okay as it's the final statement
    } catch (err) {
      console.error(
        "[NotificationsRoute] Exception fetching notifications:",
        err
      );
      res.status(500).json({ error: "An unexpected error occurred" }); // This one is okay
    }
    // No explicit return needed here as the function implicitly returns void/undefined
  }
);

// PUT /api/notifications/:id/read - Mark a specific notification as read
router.put(
  "/:id/read",
  ensureAuthenticated, // Use ensureAuthenticated
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Add return type
    // Use AuthenticatedRequest
    const userId = req.userId; // Use req.userId
    const notificationId = req.params.id;

    if (!userId || !req.supabase) {
      // Check for req.supabase as well
      res // Remove return
        .status(401)
        .json({ error: "User not authenticated or Supabase client missing" });
      return; // Add simple return
    }
    if (!notificationId) {
      res.status(400).json({ error: "Notification ID is required" }); // Remove return
      return; // Add simple return
    }

    try {
      const { data, error } = await req.supabase // Use req.supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", notificationId)
        .eq("user_id", userId) // Ensure user owns the notification
        .select()
        .single(); // Use single to ensure only one row is affected and return it

      if (error) {
        if (error.code === "PGRST116") {
          // PostgREST error code for "No rows found"
          res.status(404).json({
            // Remove return
            error: "Notification not found or user does not have permission",
          });
          return; // Add simple return
        }
        console.error(
          "[NotificationsRoute] Error marking notification as read:",
          error
        );
        res.status(500).json({ error: error.message }); // Remove return
        return; // Add simple return
      }

      if (!data) {
        res.status(404).json({
          // Remove return
          error: "Notification not found or user does not have permission",
        });
        return; // Add simple return
      }

      res.status(200).json(data as Notification); // This one is okay
    } catch (err) {
      console.error(
        "[NotificationsRoute] Exception marking notification as read:",
        err
      );
      res.status(500).json({ error: "An unexpected error occurred" }); // This one is okay
    }
    // No explicit return needed here
  }
);

// PUT /api/notifications/read-all - Mark all unread notifications as read
router.put(
  "/read-all",
  ensureAuthenticated, // Use ensureAuthenticated
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Add return type
    // Use AuthenticatedRequest
    const userId = req.userId; // Use req.userId

    if (!userId || !req.supabase) {
      // Check for req.supabase as well
      res // Remove return
        .status(401)
        .json({ error: "User not authenticated or Supabase client missing" });
      return; // Add simple return
    }

    try {
      const { error } = await req.supabase // Use req.supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("is_read", false); // Only update unread notifications

      if (error) {
        console.error(
          "[NotificationsRoute] Error marking all notifications as read:",
          error
        );
        res.status(500).json({ error: error.message }); // Remove return
        return; // Add simple return
      }

      // We don't necessarily need to return all updated notifications, just confirm success
      // This one is okay
      res
        .status(200)
        .json({ message: "All unread notifications marked as read" });
    } catch (err) {
      console.error(
        "[NotificationsRoute] Exception marking all notifications as read:",
        err
      );
      res.status(500).json({ error: "An unexpected error occurred" }); // This one is okay
    }
    // No explicit return needed here
  }
);

export default router;
