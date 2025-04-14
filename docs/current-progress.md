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

## Current State & Next Steps:

The foundation for viewing in-app notifications is built, but the _trigger_ mechanism is incorrect (based on completion, not reminders). The next phase involves refactoring to implement **reminder-based push notifications**.
