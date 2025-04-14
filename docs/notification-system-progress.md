# Notification System Progress & Architecture (v0.3.0)

This document outlines the implementation and workflow of the Mango app's reminder-based push notification system.

## Previous State (Before v0.3.0)

An initial foundation for an **in-app notification system** existed, allowing users to view messages within the app. However, notifications were incorrectly triggered upon habit _completion_ rather than based on scheduled reminders.

## Current State (As of 2025-04-15 ~1:49 AM)

The system has been refactored to deliver **reminder-based push notifications** using the Web Push API. This allows users to receive reminders even when the application tab/window is closed or not in the foreground.

**Key Components & Workflow:**

1.  **User Configuration (Habit Form - `HabitFormModal.tsx`):**

    - Users can set a specific `reminder_time` (HH:MM) for a habit.
    - Users can check the "Enable Reminder Notification" checkbox (`enable_notification` field in `manual_habits` table). Both the time and the checkbox must be set for a reminder to be active.

2.  **User Configuration (Profile Panel - `UserProfilePanel.tsx`):**

    - Users must first grant browser-level notification permission (`Notification.requestPermission()`). The current status (`granted`, `denied`, `default`) is displayed.
    - If permission is granted, users can click "Subscribe to Reminders".
      - This uses the browser's `PushManager` API (`registration.pushManager.subscribe()`) along with the application's VAPID public key (`VITE_VAPID_PUBLIC_KEY` from `.env`) to generate a unique `PushSubscription` object for that browser/device.
      - This subscription object (containing an `endpoint` URL and cryptographic `keys`) is sent to the backend API (`POST /api/user/push-subscriptions`).
    - Users can click "Unsubscribe Reminders".
      - This retrieves the current subscription object.
      - It sends the unique `endpoint` to the backend API (`DELETE /api/user/push-subscriptions`).
      - If the backend confirms deletion (or if the subscription wasn't found there - 404), it calls `subscription.unsubscribe()` locally in the browser to invalidate the subscription.

3.  **Backend Storage:**

    - `user_settings` table: Stores the user's IANA `timezone` (e.g., 'America/New_York'), crucial for sending reminders at the correct local time. This is saved via `PUT /api/user/settings`.
    - `push_subscriptions` table: Securely stores the `endpoint`, `p256dh` key, and `auth` key for each user subscription, linked via `user_id`. Managed by the `/api/user/push-subscriptions` endpoints.
    - `manual_habits` table: Stores the `reminder_time` and `enable_notification` flag for each habit.

4.  **Backend - Scheduled Task (Edge Function - `supabase/functions/send-reminders/index.ts`):**

    - **Trigger:** This function is invoked every minute via a `pg_cron` job scheduled using SQL (`SELECT cron.schedule(...)`). The cron job uses `pg_net.http_post` to call the function's invocation URL, passing the `SUPABASE_SERVICE_ROLE_KEY` for authentication.
    - **Execution:**
      - The function gets the current UTC time.
      - It queries the `manual_habits` table for habits where `enable_notification` is true and `reminder_time` is not null. It joins `user_settings` to fetch the user's `timezone`.
      - It iterates through the potential habits. For each habit:
        - It converts the current UTC time to the user's specific timezone (defaulting to UTC if none is set).
        - It compares the current minute in the user's timezone (HH:MM) with the habit's `reminder_time`. If they don't match, it skips this habit.
        - If the times match, it fetches all active `push_subscriptions` for that `user_id` from the database.
        - If subscriptions exist, it constructs the notification payload (JSON with `title` and `body`).
        - It uses the `web-push` library (configured with VAPID public/private keys and admin email from environment variables/secrets) to send the payload to each subscription endpoint.
        - **Error Handling:** If `web-push` returns a 404 or 410 status code (indicating an expired/invalid subscription), the function deletes that specific subscription record from the `push_subscriptions` table.
      - **(Optional Logging):** After successfully sending a push notification, it can insert a record into the main `notifications` table so the reminder also appears in the user's in-app notification panel.

5.  **Frontend - Service Worker (`src/sw.ts`):**
    - **Registration:** The service worker is registered and managed by the PWA setup (`vite-plugin-pwa` using `injectManifest`).
    - **`push` Event Listener:** When the browser receives a push message from the push service (triggered by the Edge Function sending via `web-push`):
      - The listener extracts the payload (title, body) sent by the Edge Function.
      - It calls `self.registration.showNotification(title, options)` to display the notification to the user via the browser/OS notification system.
    - **`notificationclick` Event Listener:** When the user clicks on the displayed notification:
      - The listener closes the notification.
      - It attempts to focus an existing window/tab of the application or opens a new one if none are found.

**Summary Flow:**

User sets reminder & subscribes -> Cron job triggers Edge Function every minute -> Edge Function checks timezones & finds due habits -> Function fetches subscriptions -> Function sends push message via web-push library -> Browser receives push -> Service Worker listens & shows notification -> User clicks notification -> Service Worker focuses/opens app.
