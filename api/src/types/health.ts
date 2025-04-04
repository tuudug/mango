// Define a type for the health entries returned by this API
export interface HealthEntry {
  id: string;
  connection_id: string;
  entry_date: string;
  type: string;
  value: number;
  created_at: string;
  updated_at: string;
  sourceProvider: "manual" | "google_health"; // Make non-optional for merged data
}

// Type for Google Health credentials stored in DB (matches calendar for now)
export interface StoredGoogleCredentials {
  access_token: string; // Encrypted
  refresh_token?: string | null; // Encrypted
  scope?: string;
  google_profile_id?: string;
  expiry_date?: number | null; // Add expiry date (timestamp in ms)
}

// Type for credentials used by googleapis client (decrypted)
export interface DecryptedGoogleCredentials {
  access_token: string;
  refresh_token?: string | null;
  scope?: string;
  expiry_date?: number | null; // Add expiry date (timestamp in ms)
}
