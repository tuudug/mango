import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config(); // Ensure environment variables are loaded

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
// Use the Service Role Key for backend operations that need elevated privileges
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  throw new Error(
    "Supabase URL, Anon Key, or Service Role Key is missing in .env file"
  );
}

// Client for general use (respects RLS based on user JWT if provided)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client with Service Role Key (bypasses RLS - use ONLY in secure backend contexts)
// We might not need this immediately, but good to have the setup ready
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Important: These options prevent the admin client from automatically using
    // any user context that might be present in incoming requests.
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

console.log("Supabase clients initialized.");
