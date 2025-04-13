# Centralized Fetching Logic (`FetchManagerContext`)

## Purpose

To consolidate and manage the triggering of data fetches across various application contexts (`Calendar`, `Health`, `Todos`, `Habits`, `Quests`, `Finance`, `Auth`). This aims to:

- Reduce redundant API calls.
- Prevent excessive fetching when the application window/tab frequently gains focus.
- Provide a consistent mechanism for background data refreshes.
- Offer a manual way for users to force a data refresh.
- Standardize logging related to data fetching.

## Implementation (`src/contexts/FetchManagerContext.tsx`)

1.  **`FetchManagerContext`:** A new React Context is created.
2.  **State:**
    - `lastFetchTimestamp`: Stores the timestamp (ms since epoch) of the last successful fetch completion.
    - `isFetching`: A boolean flag indicating if a global fetch is currently in progress.
3.  **Cooldown:** A `FETCH_COOLDOWN_SECONDS` constant (currently 180 seconds) defines the minimum time that must pass between automatic fetches triggered by focus.
4.  **`triggerGlobalFetch` Function:**
    - This is the core function responsible for initiating fetches.
    - It checks if a fetch is already `isFetching`.
    - It checks the cooldown period against `lastFetchTimestamp` unless the `force` parameter is true.
    - If allowed, it sets `isFetching` to true.
    - It calls the primary fetch functions from all relevant data contexts concurrently using `Promise.allSettled`. (e.g., `fetchEvents`, `fetchHealthData`, `fetchTodos`, `fetchHabits`, `fetchHabitEntries`, `fetchQuests`, `fetchFinanceSettings`, `fetchFinanceTodaysEntries`, `fetchUserProgress`).
    - On completion (regardless of individual fetch success/failure), it updates `lastFetchTimestamp` and sets `isFetching` to false.
5.  **Focus Listener (`useEffect`):**
    - An effect hook adds event listeners for `visibilitychange` and `focus`.
    - When the document becomes visible, it calls `triggerGlobalFetch()` (without forcing), which respects the cooldown.
6.  **Context Hooks:** The provider uses hooks (`useAuth`, `useCalendar`, etc.) to get references to the fetch functions within each data context.
7.  **Provider Integration (`src/main.tsx`):** The `FetchManagerProvider` wraps the `<App />` component, ensuring it's nested _inside_ all the data providers it needs to access.

## Refactoring of Data Contexts

All relevant data contexts (`CalendarContext`, `FinanceContext`, `HabitsContext`, `HealthContext`, `QuestsContext`, `TodosContext`) were refactored:

- Removed internal fetch-on-focus listeners.
- Removed internal cooldown/timer logic (e.g., `fetchXIfNeeded`, `lastFetchTime` state).
- Modified the initial fetch `useEffect` (dependent on `session`) to run only _once_ per session using a `useRef` flag (`initialFetchDoneRef`). This prevents redundant fetches triggered by subsequent auth state changes (like token refreshes).
- Prefixed `console.log` and `console.error` messages with the context name (e.g., `[CalendarContext] ...`).

## UI Changes

- Removed "Last synced" or countdown indicators from individual data source panels (`CalendarDataSource`, `HealthDataSource`, `TodosDataSource`).
- Added a "Manual Fetch" button (`DownloadCloud` icon) to the `LeftSidebar` below the data sources section.
  - Clicking this button calls `triggerGlobalFetch(true)`, forcing a refresh regardless of cooldown.
  - The button is disabled and shows a spinner while `isFetching` is true.
  - A tooltip on the button displays the relative time since the `lastFetchTimestamp` (e.g., "Last fetched: 5 minutes ago") or "Never fetched".

## Benefits

- More controlled and predictable data fetching.
- Reduced load on the backend API.
- Improved performance by avoiding unnecessary fetches.
- Clearer debugging with prefixed logs.
- Consistent user experience for manual data refresh.
