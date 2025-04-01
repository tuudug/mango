/**
 * Represents a single calendar event item, normalized from various sources.
 */
export interface CalendarItem {
  id: string; // Unique ID (could be from the source, e.g., Google Event ID, or generated for manual)
  sourceInstanceId: string; // ID of the specific connection in data_source_connections table
  sourceProvider: "manual" | "google_calendar"; // Explicit source provider
  title: string;
  date: string; // YYYY-MM-DD format for simplicity (consider ISO string if time is needed)
  startTime?: string; // Optional: HH:MM format or ISO string part
  endTime?: string; // Optional: HH:MM format or ISO string part
  description?: string; // Optional
  location?: string; // Optional
  color?: string; // Optional: Color hint from source or user preference
  isAllDay: boolean; // Indicates if it's an all-day event
}

/**
 * Represents a configured data source connection instance stored in the backend.
 * (Frontend might only need a subset of this).
 */
export interface DataSourceConnection {
  id: string; // Corresponds to sourceInstanceId in data items
  provider:
    | "google_calendar"
    | "manual_calendar"
    | "google_health" /* | Add other providers */;
  accountIdentifier?: string; // e.g., email address, 'Manual Entries'
  userId: string; // ID of the user this connection belongs to
  // Credentials are NOT exposed to the frontend
  preferences?: {
    color?: string; // Example preference
    // Add other source-specific preferences
  };
  createdAt: string; // ISO timestamp string
  updatedAt: string; // ISO timestamp string
}

// --- Add other data source types as needed ---

// Example for Health Data (Steps)
export interface HealthStepsData {
  id: string; // Unique ID for the data entry
  sourceInstanceId: string; // ID of the health connection
  date: string; // YYYY-MM-DD
  steps: number;
}

// Example for Health Data (Sleep) - TBD
// export interface HealthSleepData { ... }
