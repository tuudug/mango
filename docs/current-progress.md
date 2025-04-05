# Current Progress: Dashboard Edit Mode Refactor & Fixes (As of 2025-04-05 ~8:17 PM)

## Goal: Improve dashboard edit mode stability and user experience.

## Implementation Progress:

1.  **Edit State Management Refactor (`useDashboardLayout.ts`, `Dashboard.tsx`):**
    - **Issue:** Configuring newly added widgets failed because they didn't exist on the server yet. Widget config changes didn't reflect immediately. Resizing then moving a widget reverted its size.
    - **Diagnosis:** Immediate saving on every change in edit mode caused issues with unsaved items and potential race conditions. `onLayoutChange` was incorrectly discarding size updates.
    - **Resolution:**
      - Introduced separate local state (`editItems`) in `useDashboardLayout` to hold the layout being edited.
      - Modified `fetchLayout` to populate `editItems` when entering edit mode (`forEditing: true`).
      - Modified layout change handlers (`onLayoutChange`, `handleLiveResize`, `handleResizeStop`, `handleAddWidget`, `handleDeleteWidget`) in `Dashboard.tsx` to update _only_ the `editItems` state via `setEditItems` when in edit mode.
      - Modified `updateWidgetConfig` in `useDashboardLayout` to accept an `isEditing` flag and update `editItems` (without saving) or `items` (with immediate save) accordingly. Passed `isEditing` flag down from `Dashboard` -> `DashboardGrid` -> `DashboardGridItem`.
      - Created `saveEditLayout` function in `useDashboardLayout` to handle saving the final `editItems` state to the server API.
      - Modified `toggleToolbox` in `Dashboard.tsx` to call `saveEditLayout` only when closing the toolbox (exiting edit mode).
      - Corrected `onLayoutChange` in `Dashboard.tsx` to update `w` and `h` based on the layout provided by `react-grid-layout`, fixing the resize+move bug.
2.  **Save Loader (`Dashboard.tsx`):**
    - **Issue:** Exiting edit mode caused a 1-2 second delay with no feedback while saving.
    - **Resolution:**
      - Added `isSavingLayout` state to `Dashboard.tsx`.
      - Set `isSavingLayout` to `true` before calling `saveEditLayout` in `toggleToolbox` and `false` afterwards in a `finally` block.
      - Added a conditional loading overlay (spinner and "Saving Layout..." text) that displays when `isSavingLayout` is true.
3.  **Widget Update Refactor (Heatmap/Streaks - Partial):**
    - **Issue:** Habit Heatmap/Streaks widgets didn't update immediately after config change even with correct state update.
    - **Diagnosis:** Widgets used an intermediate local state derived from props, causing a delay.
    - **Resolution (Attempted):** Refactored `HabitHeatmapWidget` and `HabitStreakWidget` to remove intermediate state and trigger data fetching directly based on `config.habitId` prop change using `useEffect`. (Note: User reported this didn't fully resolve the issue, further investigation needed).

---

# Current Progress: Habits Feature Implementation & Fixes (As of 2025-04-05 ~7:30 PM)

## Goal: Implement Habits tracking with Data Source panel and Widgets, including configuration saving.

## Implementation Progress:

1.  **Database Schema (Supabase):**
    - Created `manual_habits` table (`id`, `user_id`, `name`, `type` enum, `reminder_time`, `log_type` enum \['once_daily', 'multiple_daily'], `created_at`, `updated_at`).
    - Created `manual_habit_entries` table (`id`, `user_id`, `habit_id`, `entry_date`, `completed`, `created_at`).
    - Added RLS policies for both tables.
    - Added `updated_at` trigger for `manual_habits`.
    - Created helper function `get_habit_log_type` (marked IMMUTABLE) and partial unique index `unique_once_daily_entry` on `manual_habit_entries` to enforce `once_daily` constraint.
2.  **Backend API (`/api/src/routes/habits/`):**
    - Created router and handlers for full CRUD on `/api/habits` (habit definitions) and `/api/habits/entries` (habit logs).
    - Endpoints include: `GET /habits`, `POST /habits`, `PUT /habits/:id`, `DELETE /habits/:id`, `GET /habits/entries`, `POST /habits/entries`, `DELETE /habits/entries/:entryId`.
    - Integrated `ensureAuthenticated` middleware.
    - **Fixed RLS Issue:** Updated all handlers (`addHabit`, `updateHabit`, `deleteHabit`, `getHabits`, `getHabitEntries`, `addHabitEntry`, `deleteHabitEntry`) to use the request-scoped `req.supabase` client instead of the global client, resolving "violates row-level security policy" errors.
3.  **Frontend Context (`src/contexts/HabitsContext.tsx`):**
    - Created `HabitsProvider` and `useHabits` hook.
    - Manages state for `habits` and `habitEntries`.
    - Provides functions for interacting with the backend API using `authenticatedFetch`.
    - Includes helper functions (`getEntriesForDate`, `hasEntryForDate`).
    - Fetches initial habits and recent entries on login.
4.  **Data Source Panel (`src/components/datasources/HabitsDataSource.tsx`):**
    - Created the panel component, displaying the list of habits.
    - Implemented Add/Edit/Delete functionality using `HabitFormModal.tsx`.
    - Added loading and delete confirmation states.
5.  **Sidebar Integration:**
    - Added `"habits"` to `DataSourceId` and `PanelId` types.
    - Added configuration to `dataSourceConfig.ts` (using `ListChecks` icon).
    - Added initial state to `initialPanelState` in `LeftSidebar.tsx`.
    - Rendered `<HabitsDataSource>` panel in `LeftSidebar.tsx`.
    - Wrapped `App` with `<HabitsProvider>` in `main.tsx`.
6.  **Widgets:**
    - **`HabitsListWidget.tsx`**: Displays habits, allows logging completion for the current date (handles `once_daily` vs `multiple_daily` logic).
    - **`HabitHeatmapWidget.tsx`**: Displays a GitHub-style heatmap for a selected habit (uses `react-calendar-heatmap`). Added custom CSS (`HabitHeatmapWidget.css`).
    - **`HabitStreakWidget.tsx`**: Displays current and longest streaks for a selected habit. Includes streak calculation logic.
7.  **Widget Configuration:**
    - Added `config` field (optional `Record<string, any>`) to `GridItem` type (`src/lib/dashboardConfig.ts`).
    - Added `config` column (`jsonb`) to `user_dashboard_layouts` table in Supabase.
    - Updated backend API (`GET/PUT /api/dashboards/:name`) to handle the `config` field within the `layout` array.
    - Updated frontend caching utils (`getCachedLayout`, `setCachedLayout`) and comparison util (`deepCompareLayouts`) to handle the `config` field (`src/components/dashboard/utils.ts`).
    - Added `updateWidgetConfig` function to `useDashboardLayout` hook to update a specific widget's config and trigger a save.
    - Created `HabitSelectionModal.tsx` for selecting a habit, including UI refinements.
    - Updated `DashboardGridItem.tsx` to:
      - Accept `editTargetDashboard` prop.
      - Render `HabitSelectionModal` when the pencil icon is clicked for Heatmap/Streaks widgets.
      - Call `updateWidgetConfig` with the selected habit ID and correct `dashboardName`.
      - Pass the `config` prop down to the rendered widget component.
    - Updated `HabitHeatmapWidget` and `HabitStreakWidget` to accept and use the `config` prop to determine which habit's data to display.
    - **Fixed Config Saving:** Refactored `updateWidgetConfig` in `useDashboardLayout` multiple times, finally settling on calling the non-debounced `saveLayoutDirectly` function immediately after `setItems` to resolve the issue where config changes weren't saving reliably due to potential state/timing issues. (Note: This immediate save approach was later reverted during the edit mode refactor).

---

# Current Progress: Steps Tracker Refactor & Live Resize Fix (As of 2025-04-05 ~5:53 PM)

## Goal: Improve Steps Tracker widget visualization and fix dashboard resizing behavior.

## Implementation Progress:

1.  **Steps Tracker Widget Refactor (`StepsTrackerWidget.tsx`):**
    - Replaced the custom div-based bar chart in the larger view with a `recharts` implementation, mirroring the style of `ExpensesReportWidget`.
    - Added a `ReferenceLine` for the daily step goal (hardcoded at 10,000 steps).
    - Implemented conditional bar coloring (green if goal met, blue otherwise) using `Cell`.
    - Added custom `Tooltip` and `XAxis` ticks (highlighting the current day).
    - Kept the mini view (circular progress bar) unchanged.
2.  **Steps Tracker Widget Enhancements (`StepsTrackerWidget.tsx`, `HealthContext.tsx`):**
    - Added week navigation state (`currentStepsWeekStart`) and functions (`goToPreviousStepsWeek`, `goToNextStepsWeek`, `goToCurrentStepsWeek`) to `HealthContext`.
    - Updated the larger view title to "Weekly Steps".
    - Replaced the static "Last 7 Days" badge with week navigation controls (Previous/Current/Next buttons) and a dynamic week range display.
    - The chart now displays data corresponding to the selected week via the context state.
3.  **Dashboard Live Resizing Fix (`Dashboard.tsx`, `DashboardGrid.tsx`):**
    - **Issue:** Widgets that change appearance based on size (e.g., Steps Tracker mini/full view) only updated _after_ resizing was complete, not during the drag.
    - **Diagnosis:** Layout state updates were only triggered by `onResizeStop`.
    - **Resolution:**
    - Added a new `handleLiveResize` function in `Dashboard.tsx` to update layout state (`items`) immediately during resize.
    - Passed `handleLiveResize` to `DashboardGrid.tsx` as a new `onLiveResize` prop.
    - Connected the `onLiveResize` prop to the `onResize` event handler in `DashboardGrid.tsx`.
    - Renamed the original `handleResize` function in `Dashboard.tsx` to `handleResizeStop` and updated the corresponding prop in `DashboardGrid.tsx` (`handleResizeStop` connected to `onResizeStop`) to clarify its purpose (final update and triggering save).

---

# Current Progress: API Client Refactor & 401 Retry (As of 2025-04-05 ~3:00 PM)

## Goal: Centralize API call logic and handle transient 401 errors gracefully.

## Implementation Progress:

1.  **Finance Context/Panel Reorganization:**
    - Moved finance context logic from `src/components/datasources/FinanceDataSource.tsx` to `src/contexts/FinanceContext.tsx`.
    - Renamed the finance UI panel component from `FinanceSettingsPanel` to `FinanceDataSource` and moved the file to `src/components/datasources/FinanceDataSource.tsx` for consistency.
    - Moved `ExpenseEntryModal.tsx` from `src/components/finance/` to `src/components/`.
    - Updated all relevant import paths.
2.  **API Client Utility (`src/lib/apiClient.ts`):**
    - Created a centralized `authenticatedFetch` function to handle common API call logic (adding auth headers, checking response status, parsing JSON/errors).
    - Created a custom `ApiError` class to standardize error information passed from `authenticatedFetch`.
3.  **Context Refactoring:**
    - Refactored `TodosContext`, `FinanceContext`, `CalendarContext`, and `HealthContext` to use the new `authenticatedFetch` utility, removing duplicated fetch logic and standardizing error handling.
4.  **Transient 401 Error Handling:**
    - Modified `authenticatedFetch` to automatically retry a request once after a short delay (750ms) if the initial response status is 401 (Unauthorized).
    - This prevents unnecessary error toasts caused by brief delays during Supabase token refreshes. Persistent 401 errors will still be thrown and handled by the contexts.

---

# Current Progress: Login Bug Fix (As of 2025-04-05 ~2:18 PM)

## Goal: Resolve critical bug causing infinite loop on login page.

## Implementation Progress:

1.  **Login Page Loop Fix:**
    - **Issue:** Login page sometimes showed a black screen or rapidly logged "Clearing data on logout", indicating an infinite re-render loop ("Maximum update depth exceeded").
    - **Diagnosis:** Identified that the main `useEffect` hook in `FinanceDataSource.tsx` (responsible for fetching data based on auth state) had dependencies (`fetch*` functions, `currentReportWeekStart`) that were causing it to re-run unnecessarily, even when logged out. Specifically, resetting `currentReportWeekStart` on logout likely triggered the loop.
    - **Resolution:** Refactored the `useEffect` hooks in `FinanceDataSource.tsx`. Separated the initial auth-based fetch from the effect that fetches weekly data when the `currentReportWeekStart` changes. Removed problematic dependencies (`fetch*` functions, `currentReportWeekStart`) from the auth effect and stopped resetting the week on logout within that effect.

---

## _Previous entries below this line_

# Current Progress: New Widgets & UX Refinements (As of 2025-04-04 ~8:05 PM)

## Goal: Add new widgets and improve existing widget UX/functionality.

## Implementation Progress:

1.  **Widget Adding:** Replaced drag-and-drop from toolbox with a "+" button click. New widgets are automatically placed in the first available grid slot (`Dashboard.tsx`, `WidgetToolbox.tsx`, `DashboardGrid.tsx`, removed `Draggable.tsx`/`Droppable.tsx`).
2.  **Pomodoro Widget:**
    - Created `PomodoroWidget.tsx` with 25/5 min timer, circular progress bar, and controls.
    - Implemented timer overflow: counts up with visual changes (yellow color) when phase ends.
    - Added `PomodoroContext.tsx` for global state (`idle`, `work`, `break`).
    - Added `PomodoroBanner.tsx` displayed at the top of the app, pushing content down, visible only during the 'work' phase (including overflow).
    - Added notification sound (`pomodoro_notification.mp3`) on phase end.
    - Fixed bug where banner appeared incorrectly after break overflow.
3.  **Ambience Widget:**
    - Created `AmbienceWidget.tsx` with Play/Pause button, volume slider, and info button for attribution.
    - Added `AmbienceContext.tsx` using Web Audio API to play looping rain sound (`rain.flac`). Refactored to use `suspend`/`resume` for potentially smoother looping and ignoring system media keys.
    - Added attribution modal triggered by info button.
    - Added background raindrop animation using `framer-motion`, visible only when playing. Fixed visibility issues related to CSS stacking context and overflow clipping.
    - Fixed bug where changing volume paused playback.
4.  **Affirmation Widget:**
    - Created `AffirmationWidget.tsx` displaying random static affirmations.
    - Made affirmation text clickable to show the next one (removed button).
    - Applied golden gradient text style and fixed vertical centering.
5.  **Daily Allowance Widget:**
    - Updated `formatCurrency` helper (`currencies.ts`) to prioritize currency symbol over code.
    - Refactored layout for compactness: moved "Record Expense" button to be an icon button next to the text display, centered the content group.
6.  **Widget Registration & Config:**
    - Added "Pomodoro", "Ambience", and "Affirmation Widget" types, layouts, and metadata to `widgetConfig.ts`. Added "Mindfulness/Focus" group.
    - Registered new widget components in `DashboardGridItem.tsx`.
    - Renamed "Pomodoro Widget" to "Pomodoro" and "Ambience Widget" to "Ambience" in configs.
    - Fixed issue where new widgets didn't appear in toolbox by adding "Mindfulness/Focus" to `groupOrder` in `WidgetToolbox.tsx`.
7.  **Error Handling:** Fixed issues with `ErrorBoundary` prop passing (`App.tsx`, `ErrorBoundary.tsx`).

---

# Current Progress: Refactoring & Bug Fixes (As of 2025-04-04 ~3:38 PM)

## Goal: Address Production Bugs, Refactor Configuration, Improve UX

Focused on fixing Google authentication/token issues in production, improving PWA update/error handling, and refactoring configuration for better maintainability.

## Implementation Progress:

1.  **Google Authentication (Production Fix):**
    - **Issue:** Google Auth failed on the deployed server (DigitalOcean) with `"User session not authenticated."` at `/api/auth/google/start`, while working locally.
    - **Diagnosis:** Identified the issue as Express session middleware (`cookie: { secure: true }`) not trusting the reverse proxy (likely terminating SSL).
    - **Resolution:** Added `app.set("trust proxy", 1);` in `api/src/server.ts` before session middleware to make Express trust `X-Forwarded-*` headers.
2.  **Google Health Token Refresh:**
    - **Issue:** Health data stopped fetching after ~1 hour due to expired access tokens.
    - **Diagnosis:** The `getHealthEntries.ts` API route was missing the `oauth2Client.on('tokens', ...)` listener needed to handle automatic token refreshes and update stored credentials.
    - **Resolution:** Added the token refresh handler logic (copied from `getCalendarEvents.ts`) to `getHealthEntries.ts`. Updated `health.ts` types to include `expiry_date`.
3.  **Google Health Disconnect:**
    - **Issue:** Disconnect button for Google Health didn't work; logs showed decryption errors for incorrectly encrypted old tokens.
    - **Diagnosis:**
    - Backend disconnect handler (`googleDisconnect.ts`) hardcoded `'google_calendar'` provider.
    - Frontend context (`HealthContext.tsx`) didn't send the provider type in the API call.
    - Decryption errors prevented potential token revocation logic (which wasn't strictly necessary for disconnect).
    - **Resolution:**
    - Modified `googleDisconnect.ts` to accept `provider` in the request body and use it in the Supabase delete query.
    - Updated `disconnectGoogleHealth` in `HealthContext.tsx` to call the correct endpoint (`/api/auth/google/disconnect`) and send `{ provider: 'google_health' }` in the body. This allows deleting the connection even with bad tokens.
4.  **PWA Error Handling & Update:**
    - **Issue:** App showed a blank screen on critical errors, potentially caused by outdated PWA versions.
    - **Resolution:**
    - Created a global React Error Boundary (`ErrorBoundary.tsx`).
    - Created a fallback UI component (`ErrorFallback.tsx`) showing an error message and an "Update App" button.
    - Lifted PWA update state (`needRefresh`) and function (`updateServiceWorker`) from `DashboardHeader.tsx` to `App.tsx` using `useRegisterSW`.
    - Wrapped the main `<Routes>` in `App.tsx` with the `ErrorBoundary`, passing the PWA state/function to the `ErrorFallback`.
    - Updated `Dashboard.tsx` and `DashboardHeader.tsx` to receive PWA state/function via props.
5.  **Configuration Refactoring:**
    - **Goal:** Improve organization of widget and data source configurations.
    - **Implementation:**
    - Created `src/lib/widgetConfig.ts` and moved widget-related types (`WidgetType`, `WidgetGroup`), constants (`availableWidgets`, `defaultWidgetLayouts`), and metadata (`widgetMetadata`) into it from `dashboardConfig.ts`.
    - Created `src/lib/dataSourceConfig.ts` defining data source IDs and a configuration array (`dataSourceConfig`) containing ID, label, and icon component for each data source button.
    - Cleaned up `src/lib/dashboardConfig.ts`.
    - Updated all necessary component imports (`WidgetToolbox`, `WidgetPreview`, `DashboardGridItem`, `Dashboard`, `useDashboardLayout`, `constants.ts`, `utils.ts`) to point to the new config files.
6.  **Left Sidebar Refactoring:**
    - **Goal:** Reduce duplication for data source buttons and panel logic.
    - **Implementation:**
    - Modified `LeftSidebar.tsx` to import and use `dataSourceConfig`.
    - Replaced individual panel open states (`isXxxOpen`) with a single state object (`panelOpenState`).
    - Created a generic `handleTogglePanel` function.
    - Mapped over `dataSourceConfig` to render data source buttons dynamically.
    - Updated panel rendering logic to use the consolidated state.
7.  **Mobile Edit Mode Disabled:**
    - **Goal:** Prevent users from entering dashboard edit mode on small screens.
    - **Implementation:**
    - Created/Used a utility function `isMobileView` in `src/components/dashboard/utils.ts` based on `standardBreakpoints.sm`.
    - Updated `LeftSidebar.tsx` to use this utility to check screen width on mount and resize.
    - The edit/toolbox button (`Pencil` icon) in `LeftSidebar.tsx` is now visually distinct (opacity) and shows a toast message when clicked on mobile, instead of being fully disabled or toggling edit mode.
    - Updated `Dashboard.tsx` to use the same utility function for determining the initial layout ('default' or 'mobile') to load.

---

# Current Progress: Finance Data Source & Widgets (As of 2025-04-03 ~9:24 PM)

## Goal: Implement Manual Finance Tracking

Added a new data source for manual finance tracking, including settings management and initial widgets for daily allowance and weekly expense reporting.

## Implementation Progress:

1.  **Database Schema (Supabase):**
    - Created `manual_finance_settings` table (stores `user_id`, `currency`, `daily_allowance_goal`, `salary_schedule`, `current_balance`). Includes RLS policies and `updated_at` trigger.
    - Created `manual_finance_entries` table (stores `user_id`, `entry_date`, `amount`, `description`). Includes RLS policies.
2.  **Backend API (`/api`):**
    - Added new finance router (`/api/finance`).
    - Implemented handlers for:
    - `GET /settings`: Fetch user finance settings.
    - `PUT /settings`: Upsert user finance settings (currency, goal, schedule).
    - `GET /entries/today`: Fetch today's expense entries.
    - `POST /entries`: Add a new expense entry (supports optional `entry_date`).
    - `DELETE /entries/:id`: Delete a specific expense entry.
    - `GET /entries/weekly`: Fetch aggregated daily expenses for a given week range.
    - Added `cors` middleware to `server.ts` for cross-origin requests (essential for production).
    - Fixed `passport` default import in `server.ts`.
3.  **Frontend (`/src`):**
    - **Finance Context (`FinanceDataSource.tsx`):** Created context to manage finance state (settings, today's expenses, weekly expenses), fetch data from the API, calculate remaining daily allowance, and provide functions (`addExpense`, `deleteExpense`, `updateSettings`, week navigation).
    - **Finance Settings Panel (`FinanceSettingsPanel.tsx`):** Created panel (accessible via Left Sidebar) to view/edit currency and daily goal, and view/delete today's expense entries.
    - **Left Sidebar (`LeftSidebar.tsx`):** Added "Finance Settings" button and logic to toggle the panel. Updated `showToast` calls to use new object signature.
    - **Currency Helpers (`lib/currencies.ts`):** Created constants file for currency codes/symbols and formatting functions.
    - **Expense Entry Modal (`ExpenseEntryModal.tsx`):** Created modal (triggered from Daily Allowance widget) to record new expenses, including an optional date input.
    - **Daily Allowance Widget (`DailyAllowanceWidget.tsx`):** Created widget displaying remaining daily allowance using an animated counter and circular progress bar. Removed initial loading state.
    - **Expenses Report Widget (`ExpensesReportWidget.tsx`):** Created widget displaying a weekly bar chart of expenses using `recharts`. Includes navigation controls, goal reference line, and highlighting for today's date on the X-axis.
    - **Widget Registration:** Added `DailyAllowance` and `ExpensesReport` to `dashboardConfig.ts` (types, layouts, metadata) and `WidgetToolbox.tsx` (under new "Finance" category). Registered components in `DashboardGridItem.tsx`.
    - **Provider Setup (`main.tsx`):** Wrapped app with `FinanceProvider`.
    - **Toast Context (`ToastContext.tsx`):** Updated `showToast` signature to accept an options object, aligning with `sonner` library usage.
    - **Dashboard Grid Item (`DashboardGridItem.tsx`):**
    - Added display of widget coordinates (x, y, w, h) next to the title in development mode.
    - Added error handling to display an error message and a delete button (in edit mode) for widgets with unknown types found in the layout data.
    - Corrected mapping keys for `Daily Allowance` and `Expenses Report`.

## Previous Work (Google Token Handling - Resolved 2025-04-03 ~7:43 PM)

- **Goal:** Fix Google Calendar/Health Token Decryption & Verify Refresh Logic.
- **Issue:** Decryption errors (`Unsupported state or unable to authenticate data`) were occurring when fetching Google data.
- **Resolution:** Identified and corrected an issue with the `API_ENCRYPTION_KEY` environment variable (likely a duplicate or incorrect value). After fixing the key, decryption succeeded.
- **Refresh Logic:** Confirmed that the existing refresh logic using `google-auth-library` (`oauth2Client.on('tokens', ...)` event) was likely functional but appeared broken due to the decryption failures. No code changes were needed for the refresh mechanism itself after the key was fixed.

## Previous Work (Dashboard Loading/Fetching Optimizations - Completed 2025-04-03 ~7:16 PM)

- **Goal:** Reduce dashboard loading flashes by fetching updates in the background.
- **Implementation:**
  - Modified `useDashboardLayout` hook to perform background fetches on window focus or when closing the toolbox.
  - Implemented `deepCompareLayouts` utility to compare fetched layout with current state.
  - UI state (`items`) is now only updated if the fetched layout differs from the current one.
  - Added logic to show cached layout immediately on initial load while fetching updates in the background.
  - Removed the main loading overlay, adding a specific loader only for switching between desktop/mobile edit previews.

## Previous Work (Dark Mode Enforcement - Completed 2025-04-03 ~5:18 PM)

- **Goal:** Force dark mode application-wide, ignoring device preferences.
- **Issue:** Some components retained light mode styles despite `ThemeProvider` forcing the `dark` class.
- **Resolution:** Removed conflicting `@media (prefers-color-scheme: light)` block and set `color-scheme: dark;` explicitly in `src/index.css`.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - Implement disconnect logic/route for **Google Health**. **(DONE)**
  - Refine data merging logic (e.g., summing vs. overwriting) for Health steps.
  - Add support for other health data types (sleep, weight, etc.) from Google Health.
  - Add support for external Todo providers (e.g., Google Tasks).
  - **Implement `GET /api/dashboards` endpoint to list user's dashboard names.**
  - Add validation for `salary_schedule` structure in `upsertFinanceSettings`.
- **Frontend:**
  - Refine loading/error states for non-calendar/health/todo widgets.
  - Add UI for managing other health data types (sleep, weight).
  - Add UI for connecting/disconnecting other potential external providers (Google Tasks).
  - Implement confirmation dialogs before deleting data (especially parent todos).
  - **Implement UI for Todo filtering/sorting and disable Move/DnD when active.**
  - **Make newly added sub-items enter edit mode automatically?**
  - **Persist expanded/collapsed state (e.g., in localStorage or backend)?** (Path state still uses localStorage, consider consolidating).
  - **Implement UI for creating/managing multiple named dashboards.**
  - **Add resize listener to potentially reload layout if screen size changes significantly.**
  - **Add user feedback (e.g., toasts) for layout save/load errors.**
  - Implement UI for editing `salary_schedule` in `FinanceSettingsPanel`.
  - Enhance `useAnimatedCounter` for a true slot-machine effect (optional).
  - Improve robustness of `CustomXAxisTick` highlighting for `ExpensesReportWidget` if needed.
  - **Investigate widget config update rendering issue.**
