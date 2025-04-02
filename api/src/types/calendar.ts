export interface CalendarItem {
  id: string;
  sourceInstanceId: string; // ID of the connection record
  sourceProvider: "manual" | "google_calendar"; // Explicit source provider
  title: string;
  date: string;
  isAllDay: boolean;
  startTime?: string; // Optional HH:MM
  endTime?: string; // Optional HH:MM
}

// Type for credentials stored in DB (encrypted)
export interface StoredGoogleCredentials {
  access_token: string; // Encrypted
  refresh_token?: string | null; // Encrypted
  expiry_date?: number | null; // Store expiry for proactive refresh checks
  scope?: string;
  google_profile_id?: string;
}

// Type for credentials used by googleapis client (decrypted)
export interface DecryptedGoogleCredentials {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number | null;
  scope?: string;
}
