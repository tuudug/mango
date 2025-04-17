# Notification System Progress & Architecture (v0.3.0 - API Based)

This document outlines the implementation and workflow of the Mango app's reminder-based push notification system, now running entirely within the backend API server.

## Previous State (Before Refactor)

An initial foundation for an **in-app notification system** existed, allowing users to view messages within the app. An attempt was made to implement push notifications using a **Supabase Edge Function**, but this approach faced challenges with dependency compatibility and timezone handling within the Deno runtime.

## Current State (As of 2025-04-17)

The system has been refactored to deliver **reminder-based push notifications** using the Web Push API, with the core logic moved to the main Node.js backend API server (`/api`). This allows users to receive reminders even when the application tab/window is closed or not in the foreground.

**Key Components & Workflow:**

1.  **User Configuration (Habit Form - `src/components/datasources/HabitFormModal.tsx`):**

    - Users can set a specific `reminder_time` for a habit using a **dropdown select**, enforcing **15-minute intervals** (e.g., 10:00, 10:15, 10:30). The selected time represents the desired reminder time in the user's local timezone.
    - Users can check the "Enable Reminder Notification" checkbox (`enable_notification` field in `manual_habits` table). Both the time and the checkbox must be set for a reminder to be active.
    - The `enable_notification` flag is now correctly saved via the `POST /api/habits` and `PUT /api/habits/:id` endpoints (`api/src/routes/habits/addHabit.ts`, `api/src/routes/habits/updateHabit.ts`).

2.  **User Configuration (Profile Panel - `src/components/UserProfilePanel.tsx`):**

    - Users must first grant browser-level notification permission.
    - If permission is granted, users can subscribe/unsubscribe to push notifications.
    - The user's detected IANA timezone (e.g., 'Asia/Ulaanbaatar') is now displayed in this panel.

3.  **Backend Storage:**

    - `user_settings` table: Stores the user's IANA `timezone`.
    - `push_subscriptions` table: Stores user push subscription details.
    - `manual_habits` table: Stores the `reminder_time` (as HH:MM:SS string, corresponding to the 15-min interval selected in local time) and `enable_notification` flag.
    - `notifications` table: Stores in-app notification records.

4.  **Backend - Timezone Handling (`src/contexts/AuthContext.tsx` & API):**

    - The frontend (`AuthContext`) now detects the browser's timezone on load using `Intl.DateTimeFormat().resolvedOptions().timeZone`.
    - If the `timezone` field in the user's `user_settings` (fetched via `GET /api/user/settings`) is `null`, the frontend calls `PUT /api/user/settings` to save the detected timezone automatically.
    - The `AuthContext` makes the `userSettings` (including timezone) available to components like the `UserProfilePanel`.

5.  **Backend - Scheduled Task (API Server - `api/src/services/reminderService.ts` & `api/src/server.ts`):**

    - **Trigger:** A `node-cron` job scheduled in `server.ts` runs the `checkAndSendReminders` function precisely every 15 minutes (at minutes 00, 15, 30, 45) based on **UTC**.
    - **Execution (`checkAndSendReminders`):**
      - Fetches **all** habits where `enable_notification` is true and `reminder_time` is not null, using the `supabaseAdmin` client (service role key) to bypass RLS.
      - Iterates through these habits.
      - For each habit:
        - Fetches the specific user's `timezone` from `user_settings` (defaulting to 'UTC' if null or error).
        - Calculates the **current 15-minute interval time string in the user's specific timezone** (e.g., "11:15:00") using `dayjs().tz(userTimezone)`.
        - Compares the habit's stored `reminder_time` (e.g., "11:15:00") with the calculated current interval time string for the user's timezone.
        - If they match:
          - Inserts a record into the `notifications` table using the `supabaseAdmin` client.
          - Fetches the user's `push_subscriptions` using the `supabaseAdmin` client.
          - If subscriptions exist, uses the `web-push` library (configured with VAPID keys from API environment variables) to send the push notification payload to each endpoint.
          - Handles `web-push` errors, including deleting expired/invalid subscriptions (404/410 responses) from `push_subscriptions` using the `supabaseAdmin` client.

6.  **Frontend - Service Worker (`src/sw.ts`):**

    - Listens for `push` events.
    - Displays the OS-level notification using `self.registration.showNotification()`.
    - **New:** Sends a `postMessage({ type: 'REFETCH_DATA' })` to all open application clients (tabs/windows).
    - Listens for `notificationclick` events to focus/open the app window.

7.  **Frontend - Push-Triggered Refetch (`src/contexts/FetchManagerContext.tsx`):**
    - Listens for `message` events from the service worker.
    - If a message with `{ type: 'REFETCH_DATA' }` is received, it calls `triggerGlobalFetch(true)` to force a refresh of all application data, ensuring the UI (e.g., notification panel) updates promptly.

**Summary Flow:**

User sets 15-min interval reminder (local time) & subscribes -> Timezone auto-detected/saved -> Cron job triggers API service every 15 mins (UTC) -> Service fetches all enabled habits -> For each habit, service fetches user timezone -> Service calculates current 15-min interval in user's timezone -> Service compares habit's stored time with calculated local interval -> If match: Service logs in-app notification -> Service fetches subscriptions -> Service sends push message via web-push -> Browser receives push -> Service Worker shows OS notification & posts message to app clients -> App clients receive message & trigger data refetch.
