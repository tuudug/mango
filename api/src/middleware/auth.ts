import { Request, Response, NextFunction } from "express";
import { createClient, SupabaseClient } from "@supabase/supabase-js"; // Import SupabaseClient
import { supabaseAdmin } from "../supabaseClient"; // Use admin client for verification

// Define and export an interface that extends Express.Request
// and includes our custom properties. Make them optional as they
// are only added *after* successful authentication within the middleware.
export interface AuthenticatedRequest extends Request {
  userId?: string;
  supabase?: SupabaseClient;
}

/**
 * Middleware to verify Supabase JWT from Authorization header.
 * Attaches userId and a request-scoped Supabase client (req.supabase)
 * to the request object upon successful verification.
 */
export const ensureAuthenticated = (
  req: AuthenticatedRequest, // Use the extended interface type here
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "Middleware Auth Error: Supabase URL or Anon Key missing in server config."
    );
    res.status(500).json({ message: "Server configuration error" });
    return;
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res
      .status(401)
      .json({ message: "Authorization header missing or invalid" });
    return;
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    res.status(401).json({ message: "Bearer token missing" });
    return;
  }

  // Verify token using the admin client for server-side reliability
  supabaseAdmin.auth
    .getUser(token)
    .then(({ data: { user }, error }) => {
      if (error || !user) {
        console.error(
          "Middleware Auth Error: Invalid token or session.",
          error?.message
        );
        res.status(401).json({ message: "Invalid token or session" });
        return;
      }
      // Attach user ID
      req.userId = user.id;
      // Create and attach a request-scoped client authenticated as the user
      req.supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      console.log(
        `Middleware Auth: Authenticated API request for user ID: ${user.id}`
      );
      next(); // Proceed only after attaching properties
    })
    .catch((err) => {
      console.error(
        "Middleware Auth Error: Unexpected error during token verification:",
        err
      );
      res
        .status(500)
        .json({ message: "Internal server error during authentication" });
    });
};
