import { createClient } from "@supabase/supabase-js";

// Get Supabase URL and Anon Key from environment variables
// Vite exposes env variables prefixed with VITE_
// We need to create a .env file in the root of the frontend project
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Error: Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)"
  );
  // You might want to throw an error or handle this differently depending on your app's needs
}

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

console.log("Frontend Supabase client initialized.");
