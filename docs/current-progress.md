# Current Progress: Centralized Fetching Logic (As of 2025-04-14 ~12:38 AM)

## Goal: Centralize data fetching logic, clean up logs, and add manual refresh control.

## Implementation Progress:

1.  **Central Fetch Manager (`src/contexts/FetchManagerContext.tsx`):**
    - Created a new context to orchestrate data fetches.
    - Implements a 180-second cooldown between automatic fetches triggered by window focus (`visibilitychange`/`focus` events).
    - Exposes `triggerGlobalFetch(force?: boolean)` to initiate fetches across contexts.
    - Tracks `lastFetchTimestamp` for cooldown and display purposes.
    - Manages an `isFetching` state.
2.  **Data Context Refactoring (`Calendar`, `Finance`, `Habits`, `Health`, `Quests`, `Todos`):**
    - Removed internal focus listeners and interval-based fetching logic (`fetchXIfNeeded`, `lastFetchTime`).
    - Updated initial data fetch `useEffect` hooks (dependent on `session`) to run only _once_ per session using a `useRef` flag (`initialFetchDoneRef`), preventing redundant fetches on token refresh/focus.
    - Prefixed `console.log`/`console.error` messages with context names (e.g., `[CalendarContext] ...`).
    - Removed `fetchInitialDataIfNeeded` from `HabitsContext` export and updated `FetchManagerContext` to call `fetchHabits` and `fetchHabitEntries` directly.
    - Exposed `fetchSettings` and `fetchTodaysEntries` from `FinanceContext` for the manager.
3.  **UI Updates:**
    - Removed "Last synced" / countdown displays from `CalendarDataSource`, `HealthDataSource`, and `TodosDataSource` panels.
    - Added a "Manual Fetch" button (`DownloadCloud` icon) to `LeftSidebar.tsx` (below data sources, above user profile).
    - Manual fetch button tooltip displays relative time since `lastFetchTimestamp` (using `formatDistanceToNow`).
    - Manual fetch button shows a spinner and is disabled while `isFetching` is true.
4.  **Provider Integration (`src/main.tsx`):**
    - Wrapped `<App />` with `<FetchManagerProvider>`, ensuring correct nesting inside other required data providers.
5.  **Bug Fixes:**
    - Fixed `HabitHeatmapWidget` error caused by calling the removed `fetchInitialDataIfNeeded`.
    - Resolved issue where individual contexts bypassed the fetch cooldown due to re-fetching on every auth state change.
    - Corrected duplicate `useContext` imports in `HabitsContext` and `TodosContext`.

---

# Current Progress: In-App Notification System Foundation (As of 2025-04-14 ~8:50 PM)

## Goal: Implement the basic infrastructure for an in-app notification system. (Note: Initial implementation triggered notifications on habit _completion_, which was incorrect. This needs refactoring to trigger based on habit _reminders_.)

## Implementation Progress:

1.  **Database Schema:**
    - Created `notifications` table (`id`, `user_id`, `created_at`, `type`, `title`, `body`, `is_read`, `read_at`, `related_entity_id`) with RLS.
    - Created `user_settings` table (`user_id`, `notification_permission`, `created_at`, `updated_at`) with RLS.
    - Added `enable_notification` boolean column to `manual_habits` table.
    - Updated Supabase types (`api/src/types/supabase.ts`).
2.  **Backend API (`api/src/routes`):**
    - Created `notifications.ts` router with endpoints:
      - `GET /`: Fetch user's notifications (all or filtered by `read` status).
      - `PUT /:id/read`: Mark a specific notification as read.
      - `PUT /read-all`: Mark all user's unread notifications as read.
    - Created `user/updateSettings.ts` handler and added `PUT /api/user/settings` route to `user.ts` router for saving notification permission preference.
    - **(Incorrect Implementation - Needs Removal/Refactor):** Modified `habits/addHabitEntry.ts` (`POST /api/habits/entries`) to insert a notification into the `notifications` table upon successful habit entry creation _if_ the habit's `enable_notification` flag was true.
    - Registered `notificationsRoutes` and `userRoutes` (with the new settings route) in `server.ts`.
3.  **Frontend Context (`src/contexts`):**
    - Created `NotificationContext.tsx` to manage:
      - Browser notification permission status (`permissionStatus`).
      - Fetched notifications (`notifications`, `unreadCount`).
      - Loading state (`isLoading`).
      - Functions: `requestPermission`, `fetchNotifications`, `markAsRead`, `markAllAsRead`.
    - Implemented `updateStoredPermission` within the context to call `PUT /api/user/settings`.
    - Wrapped `FetchManagerProvider` with `NotificationProvider` in `main.tsx` (corrected nesting order).
    - Integrated `fetchNotifications` call into `FetchManagerContext.tsx`.
    - Updated `HabitsContext.tsx` to include `enable_notification` in the `Habit` type definition.
4.  **Frontend UI (`src/components`):**
    - Added logic to `App.tsx` to call `requestPermission` from `NotificationContext` on initial load if status is 'default'. Refactored to fix React Hook order errors.
    - Added "Notify on Completion" checkbox (`enable_notification`) to `HabitFormModal.tsx`.
    - Created `NotificationsPanel.tsx` component to display notifications list, show relative timestamps, and allow marking as read (individually/all).
    - Added notification indicator (Bell icon + unread badge) to `DashboardHeader.tsx`.
    - Added state and toggle logic to `Dashboard.tsx` to manage the visibility of `NotificationsPanel`, rendering it as a right-side overlay.
    - Added display of browser notification permission status (`Granted`/`Denied`/`Not Requested`) to `UserProfilePanel.tsx`.
5.  **Bug Fixes:**
    - Resolved various TypeScript errors related to middleware usage, async function return types, and hook dependencies.
    - Fixed React Hook order errors in `App.tsx`.
    - Corrected duplicate imports caused by faulty replace operations.

## Current State:

The foundation for viewing in-app notifications is built, but the _trigger_ mechanism was incorrect (based on completion, not reminders). This has now been refactored.

---

# Current Progress: Reminder Push Notification System (As of 2025-04-15 ~1:47 AM)

## Goal: Refactor the notification system to send reminder-based push notifications using Web Push API, allowing notifications even when the app is closed.

## Implementation Progress:

1.  **Database Schema:**
    - Added `timezone` column to `user_settings` table to store user's IANA timezone.
    - Created `push_subscriptions` table (`id`, `user_id`, `endpoint`, `p256dh`, `auth`, `created_at`) to store user Web Push subscription details, with RLS policies.
    - Regenerated Supabase types (`api/src/types/supabase.ts`).
2.  **Backend API (`api/src/routes`):**
    - Removed incorrect notification trigger logic from `habits/addHabitEntry.ts`.
    - Updated `user/updateSettings.ts` handler (`PUT /api/user/settings`) to accept and save the `timezone`.
    - Created `user/pushSubscriptions.ts` handlers for adding (`POST /api/user/push-subscriptions`) and deleting (`DELETE /api/user/push-subscriptions`) user push subscriptions.
    - Registered new push subscription routes in `user.ts`.
3.  **Backend - Scheduled Task (`supabase/functions/send-reminders/index.ts`):**
    - Created a Supabase Edge Function (`send-reminders`) designed to be triggered by a cron schedule (e.g., every minute).
    - Function logic:
      - Fetches habits due for a reminder based on the current minute, joining `user_settings` to get the user's timezone.
      - Filters habits by comparing the stored `reminder_time` (HH:MM) with the current time converted to the user's specific timezone.
      - Fetches the user's stored push subscriptions from the `push_subscriptions` table.
      - Uses the `web-push` library (configured with VAPID keys set as environment variables/secrets) to send a push notification payload (title, body) to each valid subscription endpoint.
      - Includes logic to delete expired/invalid subscriptions (HTTP 404/410 responses) from the database.
      - Optionally logs the sent reminder to the in-app `notifications` table.
4.  **Frontend - Service Worker (`src/sw.ts` & `vite.config.ts`):**
    - Created a custom service worker file (`src/sw.ts`).
    - Added event listeners within the service worker for:
      - `push`: To receive push messages, parse the payload (title, body), and display an OS-level notification using `self.registration.showNotification()`.
      - `notificationclick`: To handle user clicks on the notification (closes notification, focuses/opens the app window).
    - Updated `vite.config.ts` to use the `injectManifest` strategy, pointing to `src/sw.ts`, ensuring the custom service worker logic is included in the build.
5.  **Frontend UI (`src/components/UserProfilePanel.tsx`):**
    - Added state management to track push subscription status (`isSubscribed`, loading states).
    - Implemented logic to check the current push subscription status on component mount using `navigator.serviceWorker.ready` and `registration.pushManager.getSubscription()`.
    - Added "Subscribe to Reminders" and "Unsubscribe Reminders" buttons, visible only when browser notification permission is granted.
    - Implemented `subscribeUser` function:
      - Checks for VAPID public key (`VITE_VAPID_PUBLIC_KEY` env var).
      - Uses `registration.pushManager.subscribe()` to get a new `PushSubscription` object from the browser.
      - Sends the subscription object to the backend (`POST /api/user/push-subscriptions`) using `authenticatedFetch`.
      - Handles errors and updates UI state.
    - Implemented `unsubscribeUser` function:
      - Gets the current subscription using `registration.pushManager.getSubscription()`.
      - Sends the subscription endpoint to the backend (`DELETE /api/user/push-subscriptions`) using `authenticatedFetch`.
      - If backend deletion is successful (or 404), calls `subscription.unsubscribe()` locally.
      - Handles errors and updates UI state.
    - Ensured `authenticatedFetch` calls use the correct function signature (url, method, session, body).
6.  **Frontend UI (`src/components/datasources/HabitFormModal.tsx`):**
    - Updated the label for the `enable_notification` checkbox from "Notify on Completion" to "Enable Reminder Notification" for clarity.

## Current State:

The reminder-based push notification system is implemented across the stack. Final steps involve configuration (VAPID keys, Edge Function deployment/scheduling) and testing.
