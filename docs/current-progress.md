# Current Progress: Dashboard Persistence, Mobile Edit, PWA Update Fix (As of 2025-04-03 ~1:35 PM)

## Goal: Implement Database Persistence for Dashboard Layouts, Add Mobile Layout Editing, Fix PWA Update Flow

Recent work focused on moving dashboard layout storage from localStorage to the database, enabling multi-device sync and future multi-dashboard support. Added functionality to edit a separate mobile layout from the desktop view. Also fixed issues with the PWA update notification button.

## Architecture Decisions:

- **Backend API:** Node.js/Express backend service (`/api`). (No change)
- **Database:** Supabase (PostgreSQL).
  - **Added `user_dashboard_layouts` table:** Stores layouts (`id`, `user_id`, `name`, `layout`, `created_at`, `updated_at`). Unique constraint on `(user_id, name)`. RLS policies implemented. `updated_at` trigger added.
  - `manual_todo_items` table structure unchanged.
- **Authentication:** Frontend Supabase Auth, Backend JWT verification. (No change)
- **Google OAuth:** Passport.js handles Google OAuth flow. (No change)
- **Data Flow:**
  - Frontend contexts fetch from backend API. (No change)
  - **Dashboard layouts now fetched from/saved to `/api/dashboards/:name` endpoints.**
- **RLS Handling:** Backend middleware uses request-scoped Supabase client. (No change)
- **Task Breakdown:** Google Gemini API integration unchanged.
- **Notifications:** `sonner` library integration unchanged.
- **API Dev Environment (Windows):** Setup unchanged.

## Implementation Progress:

1.  **PWA Update Button (`src/components/DashboardHeader.tsx`):**
    - Fixed issue where button showed "No updates available" incorrectly on initial load by adding a "Checking..." state.
    - Fixed issue where clicking update caused a blank screen by awaiting the `updateServiceWorker` call before reloading (`window.location.reload()`).
    - Resolved infinite "Checking..." state by relying on `offlineReady` state and adding a timeout fallback. Identified that service worker doesn't register on localhost by design.
2.  **Supabase Setup:**
    - **Created `user_dashboard_layouts` table** with appropriate columns, constraints, RLS policies, and `updated_at` trigger via SQL script (executed manually by user).
    - `move_todo_item` function unchanged.
3.  **Backend API (`/api`):**
    - **Added Dashboard Routes (`api/src/routes/dashboards.ts`):**
      - Created new router file.
      - Added `GET /api/dashboards/:name` endpoint (`getDashboardLayout.ts`) to fetch layout by name for the authenticated user. Returns layout JSON or null.
      - Added `PUT /api/dashboards/:name` endpoint (`upsertDashboardLayout.ts`) to create/update layout by name for the authenticated user (uses Supabase upsert).
      - Mounted dashboard routes in `api/src/server.ts`.
    - **Updated Auth Middleware (`api/src/middleware/auth.ts`):**
      - Corrected export name usage (`ensureAuthenticated`).
      - Defined `AuthenticatedRequest` interface to properly type `userId` and `supabase` properties added by the middleware.
      - Added checks in handlers to ensure `userId` and `supabase` exist on `req`.
    - Previous API routes (`health`, `calendar`, `auth`, `todos`) unchanged.
4.  **Frontend (`/src`):**
    - **Refactored `Dashboard.tsx`:**
      - Removed localStorage logic (`loadLayoutFromLocalStorage`, `saveLayoutToLocalStorage`).
      - Added state: `isLoadingLayout`, `currentViewDashboardName`, `editTargetDashboard`.
      - Implemented `fetchLayout` function using `/api/dashboards/:name`.
      - Implemented debounced `saveLayoutToServer` function using `/api/dashboards/:name`.
      - **Initial Load:** `useEffect` fetches 'default' or 'mobile' layout based on `window.innerWidth` on mount.
      - **Layout Saving:** `onLayoutChange` and `onResizeStop` now call `saveLayoutToServer` with the correct dashboard name (`editTargetDashboard` if editing, `currentViewDashboardName` otherwise). `handleDeleteWidget` also saves correctly.
      - **Mobile Edit Mode:**
        - Added toggle button to floating edit indicator bar to switch `editTargetDashboard` between 'default' and 'mobile'.
        - Conditionally renders a separate `<ResponsiveReactGridLayout>` instance for mobile edit mode.
        - Mobile grid uses fixed `cols={ mobile: 4 }` and specific breakpoints.
        - Mobile grid wrapper (`div`) styled with fixed width (`w-[375px]`) and dashed border when `isMobileEditMode` is true.
        - `useEffect` re-fetches layout when `editTargetDashboard` changes while toolbox is open.
      - **Panel Behavior:** Modified `mainContentPaddingLeft` calculation so only `WidgetToolbox` pushes the grid content; other panels slide over.
      - **Loading State:** Improved loading indicator to only show within the main grid area, preventing full-screen flash.
      - **Exiting Edit Mode:** `toggleToolbox` now correctly reloads the appropriate view layout ('default' or 'mobile') based on screen width when exiting edit mode.
    - **Updated `WidgetToolbox.tsx`:**
      - Accepts `editTargetDashboard` prop.
      - Filters displayed widgets based on `editTargetDashboard`, showing only widgets with `minW <= 4` when editing 'mobile'.
      - Updated informational text at the bottom.
    - TodoList component refactoring unchanged.
    - Contexts (`AuthContext`, `TodosContext`, etc.) unchanged except for `useAuth` usage in `Dashboard.tsx`.
5.  **Testing:**
    - Previous functionalities confirmed working.
    - **Manual testing confirms:** PWA update button flow works correctly (shows checking, handles update). Dashboard layout loads from API based on screen width. Layout changes are saved via API (debounced). Mobile edit mode displays correctly with a 4-column grid, fixed width, and border. Toolbox filters correctly in mobile edit mode. Exiting mobile edit mode correctly reverts the view. Panels (except toolbox) slide over the grid. Loading indicator is less jarring.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - Implement token refresh logic for **Google Health** tokens.
  - Implement disconnect logic/route for **Google Health**.
  - Refine data merging logic (e.g., summing vs. overwriting) for Health steps.
  - Add support for other health data types (sleep, weight, etc.) from Google Health.
  - Add support for external Todo providers (e.g., Google Tasks).
  - **Implement `GET /api/dashboards` endpoint to list user's dashboard names.**
- **Frontend:**
  - Refine loading/error states for non-calendar/health/todo widgets.
  - Add UI for managing other health data types (sleep, weight).
  - Add UI for connecting/disconnecting other potential external providers (Google Tasks).
  - Implement confirmation dialogs before deleting data (especially parent todos).
  - **Implement UI for Todo filtering/sorting and disable Move/DnD when active.**
  - **Make newly added sub-items enter edit mode automatically?**
  - **Persist expanded/collapsed state (e.g., in localStorage or backend)?**
  - **Implement UI for creating/managing multiple named dashboards.**
  - **Add resize listener to potentially reload layout if screen size changes significantly.**
  - **Add user feedback (e.g., toasts) for layout save/load errors.**
