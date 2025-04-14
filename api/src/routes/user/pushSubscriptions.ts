import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import { Database } from "../../types/supabase"; // Assuming this path is correct despite TS errors elsewhere

// Define expected request body structure for adding a subscription
interface AddPushSubscriptionRequestBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Define expected request body structure for deleting a subscription
// We'll use the endpoint URL as the identifier
interface DeletePushSubscriptionRequestBody {
  endpoint: string;
}

export const addPushSubscription = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase;
  const { endpoint, keys }: AddPushSubscriptionRequestBody = req.body;

  if (!userId || !supabase) {
    res
      .status(401)
      .json({ error: "User not authenticated or Supabase client missing" });
    return;
  }

  // Basic validation
  if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
    res
      .status(400)
      .json({
        error:
          "Missing required subscription fields: endpoint, keys.p256dh, keys.auth",
      });
    return;
  }
  if (
    typeof endpoint !== "string" ||
    typeof keys.p256dh !== "string" ||
    typeof keys.auth !== "string"
  ) {
    res.status(400).json({ error: "Invalid type for subscription fields" });
    return;
  }

  try {
    // Upsert the subscription based on the unique endpoint for the user
    // This handles both new subscriptions and updates to existing ones (though updates are less common for endpoints)
    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        {
          onConflict: "endpoint", // Use endpoint as the conflict target
          // ignoreDuplicates: false is default, ensures update if keys change for same endpoint
        }
      )
      .select()
      .single();

    if (error) {
      console.error(
        "[Push Subscriptions] Error upserting push subscription:",
        error
      );
      // Handle potential RLS issues or other DB errors
      res.status(500).json({ error: error.message });
      return;
    }

    console.log(
      `[Push Subscriptions] Subscription added/updated for user ${userId}, endpoint: ${endpoint.substring(
        0,
        40
      )}...`
    );
    res.status(201).json(data); // 201 Created or 200 OK if updated
  } catch (err) {
    console.error(
      "[Push Subscriptions] Unexpected error adding subscription:",
      err
    );
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};

export const deletePushSubscription = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  const userId = req.userId;
  const supabase = req.supabase;
  // Get endpoint from request body for DELETE
  const { endpoint }: DeletePushSubscriptionRequestBody = req.body;

  if (!userId || !supabase) {
    res
      .status(401)
      .json({ error: "User not authenticated or Supabase client missing" });
    return;
  }

  if (!endpoint || typeof endpoint !== "string") {
    res
      .status(400)
      .json({ error: "Missing or invalid 'endpoint' in request body" });
    return;
  }

  try {
    // Delete the subscription matching the user ID and endpoint
    const { error, count } = await supabase
      .from("push_subscriptions")
      .delete({ count: "exact" }) // Request count of deleted rows
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error(
        "[Push Subscriptions] Error deleting push subscription:",
        error
      );
      res.status(500).json({ error: error.message });
      return;
    }

    if (count === 0) {
      console.warn(
        `[Push Subscriptions] No subscription found to delete for user ${userId} with endpoint: ${endpoint.substring(
          0,
          40
        )}...`
      );
      // Return 404 Not Found if nothing was deleted
      res
        .status(404)
        .json({ message: "Subscription not found for this user." });
    } else {
      console.log(
        `[Push Subscriptions] Subscription deleted successfully for user ${userId}, endpoint: ${endpoint.substring(
          0,
          40
        )}...`
      );
      res.status(204).send(); // 204 No Content on successful deletion
    }
  } catch (err) {
    console.error(
      "[Push Subscriptions] Unexpected error deleting subscription:",
      err
    );
    res.status(500).json({ error: "An unexpected error occurred" });
  }
};
