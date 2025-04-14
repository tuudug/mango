# Notification System Progress & Next Steps

This document outlines the current state and future tasks for the Mango app's notification system.

## Current State (As of 2025-04-14 ~8:50 PM)

An initial foundation for an **in-app notification system** has been implemented. This system allows users to view messages within the application interface.

**Implemented Features:**

1.  **Database:**
    - `notifications` table: Stores notification details (message, type, read status, etc.).
    - `user_settings` table: Stores user preferences, including browser notification permission status (`granted`/`denied`/`default`).
    - `manual_habits` table: Includes an `enable_notification` flag (currently tied to the incorrect completion trigger).
2.  **Backend API:**
    - Endpoints to fetch notifications (`GET /api/notifications`).
    - Endpoints to mark notifications as read (`PUT /api/notifications/:id/read`, `PUT /api/notifications/read-all`).
    - Endpoint to save notification permission preference (`PUT /api/user/settings`).
3.  **Frontend:**
    - `NotificationContext`: Manages notification state, permission status, and API interactions.
    - Browser Permission Request: Asks for browser notification permission on app load if not already set (`App.tsx`).
    - In-App Panel: A dedicated panel (`NotificationsPanel.tsx`) displays fetched notifications, accessible via a Bell icon in the main header (`DashboardHeader.tsx`).
    - Unread Indicator: The Bell icon shows a badge when unread notifications exist.
    - Permission Display: The user profile panel (`UserProfilePanel.tsx`) shows the current browser notification permission status.
    - Habit Form Toggle: A checkbox exists in the habit form (`HabitFormModal.tsx`) related to `enable_notification`.

**Incorrect Implementation:**

- **Trigger:** Currently, notifications are incorrectly generated _after_ a habit is marked complete, based on the `enable_notification` flag. This is not the desired behavior.

## Next Steps: Refactor to Reminder-Based Push Notifications

The primary goal now is to refactor the system to send **reminder notifications** based on the `reminder_time` set for habits, using **browser/OS push notifications** so they can be received even when the app is closed.

**Task Breakdown:**

1.  **Remove Incorrect Completion Trigger:**
    - Modify `api/src/routes/habits/addHabitEntry.ts`: Remove the logic that inserts into the `notifications` table upon habit completion.
2.  **Refactor Habit Form UI:**
    - Modify `src/components/datasources/HabitFormModal.tsx`:
      - Change the label for the `enable_notification` checkbox from "Notify on Completion" to something like "Enable Reminder Notification".
      - Potentially make setting a `reminder_time` conditional on this checkbox being checked, or vice-versa, for clarity.
3.  **Backend - Scheduled Function (Supabase Edge Function):**
    - Create a new Supabase Edge Function scheduled to run frequently (e.g., every minute via cron).
    - Implement logic within the function to:
      - Query the `manual_habits` table for all habits that have `enable_notification` set to `true` and a `reminder_time` matching the current time (minute precision).
      - **Crucially:** Account for user timezones. This likely requires storing the user's timezone (e.g., in `user_settings`) and performing timezone conversions during the query or processing.
      - For each due reminder, retrieve the necessary user ID and habit details (name).
      - Retrieve the user's push notification subscription details (see step 5).
      - Construct the notification payload (title, body).
      - Send the push notification using a web push library (e.g., `web-push`) and the user's subscription details.
      - **(Optional but Recommended):** Insert a corresponding record into the `notifications` table so the reminder also appears in the in-app panel.
4.  **Frontend - Service Worker & Push API:**
    - Enhance the existing PWA setup (`vite.config.ts`, potentially `src/service-worker.ts` or similar) to handle push events.
    - Implement a Service Worker (`sw.js` or similar) that listens for `push` events.
    - When a push event is received, use `self.registration.showNotification()` to display the OS-level notification using the payload sent from the Edge Function.
    - Handle notification clicks (e.g., focus the app window).
5.  **Frontend/Backend - Push Subscription Management:**
    - **Database:** Create a new table (e.g., `push_subscriptions`) to store user push subscription objects (endpoint, keys). Ensure RLS allows users to manage their own subscriptions.
    - **Frontend UI:** Add UI elements (likely in Account Settings or User Profile) to:
      - Allow users to subscribe to push notifications (using `registration.pushManager.subscribe()`).
      - Display the current subscription status.
      - Allow users to unsubscribe (`subscription.unsubscribe()`).
    - **Frontend Logic:** When a user subscribes, send the subscription object to the backend.
    - **Backend API:** Create new API endpoints (e.g., `POST /api/user/push-subscriptions`, `DELETE /api/user/push-subscriptions/:endpoint`) to save and delete subscription details in the `push_subscriptions` table.
6.  **User Timezone Handling:**
    - **Backend:** Ensure the `PUT /api/user/settings` endpoint can also save the user's timezone (e.g., from `Intl.DateTimeFormat().resolvedOptions().timeZone` sent via a header like `X-User-Timezone`).
    - **Database:** Add a `timezone` column to the `user_settings` table.
    - **Scheduled Function:** Utilize the stored timezone when querying for due reminders.

This outlines the significant work required to transition from the current basic in-app system to a fully functional reminder-based push notification system.
