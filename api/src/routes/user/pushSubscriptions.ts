import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
// Database type not strictly needed here
import {
  InternalServerError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from "../../utils/errors";

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
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const { endpoint, keys }: AddPushSubscriptionRequestBody = req.body;

  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    // Basic validation
    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return next(
        new ValidationError(
          "Missing required subscription fields: endpoint, keys.p256dh, keys.auth"
        )
      );
    }
    if (
      typeof endpoint !== "string" ||
      typeof keys.p256dh !== "string" ||
      typeof keys.auth !== "string"
    ) {
      return next(new ValidationError("Invalid type for subscription fields"));
    }

    const { data, error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        },
        { onConflict: "endpoint" }
      )
      .select()
      .single();

    if (error) {
      console.error(
        "[Push Subscriptions] Supabase error upserting push subscription:",
        error
      );
      return next(
        new InternalServerError(
          "Failed to save push subscription due to database error."
        )
      );
    }

    // .single() guarantees data if error is null
    console.log(
      `[Push Subscriptions] Subscription added/updated for user ${userId}, endpoint: ${endpoint.substring(
        0,
        40
      )}...`
    );
    // Use 200 OK for upsert, as it could be an update or insert
    res.status(200).json(data);
  } catch (err) {
    // Catch unexpected errors
    console.error(
      "[Push Subscriptions] Unexpected error adding subscription:",
      err
    );
    next(err); // Pass to global error handler
  }
};

export const deletePushSubscription = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction // Add next function
): Promise<void> => {
  const { endpoint }: DeletePushSubscriptionRequestBody = req.body;

  try {
    const userId = req.userId;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    if (!endpoint || typeof endpoint !== "string") {
      return next(
        new ValidationError("Missing or invalid 'endpoint' in request body")
      );
    }

    const { error, count } = await supabase
      .from("push_subscriptions")
      .delete({ count: "exact" })
      .eq("user_id", userId)
      .eq("endpoint", endpoint);

    if (error) {
      console.error(
        "[Push Subscriptions] Supabase error deleting push subscription:",
        error
      );
      return next(
        new InternalServerError(
          "Failed to delete push subscription due to database error."
        )
      );
    }

    if (count === 0) {
      console.warn(
        `[Push Subscriptions] No subscription found to delete for user ${userId} with endpoint: ${endpoint.substring(
          0,
          40
        )}...`
      );
      // Use NotFoundError for consistency
      return next(new NotFoundError("Subscription not found for this user."));
    }

    console.log(
      `[Push Subscriptions] Subscription deleted successfully for user ${userId}, endpoint: ${endpoint.substring(
        0,
        40
      )}...`
    );
    res.status(204).send(); // Success, no content
  } catch (err) {
    // Catch unexpected errors
    console.error(
      "[Push Subscriptions] Unexpected error deleting subscription:",
      err
    );
    next(err); // Pass to global error handler
  }
};
