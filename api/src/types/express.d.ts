import { SupabaseClient } from "@supabase/supabase-js";
import { Session } from "express-session";

// Define session interface to include our custom property
declare module "express-session" {
  interface SessionData {
    supabaseUserId?: string;
  }
}

// Define the shape of the user object attached by Passport's deserializeUser
export interface PassportUser {
  id: string;
}

declare global {
  namespace Express {
    // Add our 'id' property to Express.User
    interface User {
      id: string;
    }

    interface Request {
      userId?: string;
      supabase?: SupabaseClient;
      user?: User;
      isAuthenticated?: () => boolean;
      login?: (user: User, done: (err: Error | null) => void) => void;
      logout?: () => void;
      session?: Session;
    }
  }
}

// This is needed to make this file a module
export {};
