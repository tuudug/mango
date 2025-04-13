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
