# Current Progress: Dashboard Caching, Refactoring, UX Fixes (As of 2025-04-03 ~3:26 PM)

## Goal: Implement Local Caching, Refactor Dashboard Component, Improve Panel UX

Recent work focused on implementing local storage caching for dashboard layouts to improve performance, refactoring the large `Dashboard.tsx` component for better maintainability, and refining the user experience related to panel interactions during edit mode.

## Architecture Decisions:

- **Backend API:** Node.js/Express backend service (`/api`). (No change)
- **Database:** Supabase (PostgreSQL).
  - `user_dashboard_layouts` table structure unchanged.
  - `manual_todo_items` table structure unchanged.
- **Authentication:** Frontend Supabase Auth, Backend JWT verification. (No change)
- **Google OAuth:** Passport.js handles Google OAuth flow. (No change)
- **Data Flow:**
  - Frontend contexts fetch from backend API. (No change)
  - Dashboard layouts fetched from/saved to `/api/dashboards/:name` endpoints. (No change)
  - **Added Local Storage Caching:** Dashboard layouts ('default', 'mobile') and last sync time are now cached in `localStorage` to reduce API calls and improve load times.
- **RLS Handling:** Backend middleware uses request-scoped Supabase client. (No change)
- **Task Breakdown:** Google Gemini API integration unchanged.
- **Notifications:** `sonner` library integration unchanged.
- **API Dev Environment (Windows):** Setup unchanged.

## Implementation Progress:

1.  **PWA Update Button (`src/components/DashboardHeader.tsx`):** (Previous work - No change)
    - Fixed initial state, update flow, and localhost behavior.
2.  **Supabase Setup:** (Previous work - No change)
    - `user_dashboard_layouts` table created.
    - `move_todo_item` function unchanged.
3.  **Backend API (`/api`):** (Previous work - No change)
    - Dashboard routes (`GET /:name`, `PUT /:name`) implemented.
    - Auth middleware updated.
4.  **Frontend (`/src`):**
    - **Implemented Dashboard Caching (`src/components/Dashboard.tsx`, `src/components/dashboard/utils.ts`):**
      - Added local storage keys (`mango_dashboard_layout_*`, `mango_dashboard_last_sync_time`).
      - Added helper functions (`getCachedLayout`, `setCachedLayout`, etc.) in `utils.ts`.
      - Modified `fetchLayout` in `useDashboardLayout` hook to save fetched layout and sync time to cache.
      - Modified `saveLayoutToServer` in `useDashboardLayout` hook to update cache and sync time on successful save.
      - **Initial Load:** Now attempts to load from cache first. Fetches from server only if cache is missing or stale (checked in background).
      - **App Focus:** Added `visibilitychange` listener to check cache staleness (12-hour limit) and force fetch if needed when app regains focus (and not in edit mode).
      - **Edit Mode:** Entering edit mode, switching edit target, or explicitly closing edit mode always force-fetches the relevant layout from the server. Implicitly closing edit mode (by opening another panel) does _not_ trigger a fetch.
    - **Refactored `Dashboard.tsx`:**
      - **Extracted Modules:** Created `src/components/dashboard/` directory.
        - Moved types to `types.ts`.
        - Moved constants (`pathsData`, storage keys, breakpoints, `getDefaultLayout`) to `constants.ts`.
        - Moved local storage and path state helpers to `utils.ts`.
        - Created `hooks/useDashboardLayout.ts` to encapsulate layout state (`items`, `isLoadingLayout`) and logic (`fetchLayout`, `saveLayoutToServer`).
        - Created `components/DashboardGrid.tsx` to handle grid rendering logic (including separate instances for standard and mobile-edit views).
        - Created `components/EditModeIndicator.tsx` for the floating edit bar.
      - **Simplified `Dashboard.tsx`:** Removed extracted logic/state, uses `useDashboardLayout` hook, renders new sub-components (`DashboardGrid`, `EditModeIndicator`). Primarily manages toolbox state and DnD context.
    - **Refactored `LeftSidebar.tsx`:**
      - **Moved Panel State:** State management (`useState`) for GM, Profile, Paths, and Data Source panels moved from `Dashboard.tsx` into `LeftSidebar.tsx`.
      - **Moved Panel Rendering:** Conditional rendering of these panels moved into `LeftSidebar.tsx`.
      - **Centralized Toggle Logic:** Internal handlers in `LeftSidebar.tsx` now manage opening/closing panels, ensuring only one is open and closing the toolbox if necessary.
      - **Simplified Props:** Only receives `isToolboxOpen` and `toggleToolbox` from `Dashboard.tsx` related to panel interaction.
    - **Improved Panel UX:**
      - **Overlay:** Added a semi-transparent overlay (`bg-black/50`) when side panels are open. Clicking it closes the panel.
      - **Max Width:** Replaced fixed widths on panels (`GameMasterPanel`, `PathsPage`, Data Source panels) with `max-width` and `w-full` for better responsiveness.
      - **Edit Mode Interaction:** Clicking a panel button while in edit mode now prevents the panel from opening, shakes the `EditModeIndicator`, and shows a toast ("Please exit edit mode first.") using `useToast` context.
    - **CSS Updates (`src/index.css`):**
      - Restored original `.widget-shake` animation (using `rotate`).
      - Added new `@keyframes gentle-shake` (using `translateX`) and `.indicator-shake` class for the edit mode indicator.
    - **Bug Fixes:**
      - Fixed issue where closing edit mode while previewing mobile layout didn't return to the desktop view.
      - Fixed issue where opening side panels incorrectly triggered dashboard layout fetches.
      - Fixed issue where indicator shake animation caused positional shift.
5.  **Testing:**
    - Previous functionalities confirmed working.
    - **Manual testing confirms:** Caching logic works as expected (loads from cache, fetches when stale/forced). Dashboard refactoring maintains functionality. Panel state is managed by `LeftSidebar`. Overlay appears correctly. Panels use max-width. Attempting to open panels during edit mode triggers shake and toast. Exiting edit mode correctly returns to the default desktop view.

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
  - **Persist expanded/collapsed state (e.g., in localStorage or backend)?** (Path state still uses localStorage, consider consolidating).
  - **Implement UI for creating/managing multiple named dashboards.**
  - **Add resize listener to potentially reload layout if screen size changes significantly.**
  - **Add user feedback (e.g., toasts) for layout save/load errors.** (Partially done for edit mode conflict).
