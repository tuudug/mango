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

## _Previous entries below this line_

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
