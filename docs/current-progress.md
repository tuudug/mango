# Current Progress: Google Token Handling (As of 2025-04-03 ~3:30 PM)

## Goal: Fix Google Calendar/Health Token Decryption & Implement Refresh Logic

The immediate focus is to resolve errors related to decrypting stored Google API credentials (access and refresh tokens) in the backend and implement the necessary logic to automatically refresh expired access tokens using the stored refresh tokens. This is crucial for ensuring continuous data synchronization for Google Calendar and Google Health integrations.

## Current Issues:

- **Decryption Errors:** The backend API (`/api`) is logging errors when attempting to decrypt stored Google credentials from the `data_source_connections` table, specifically within the `getCalendarEvents.ts` and `getHealthEntries.ts` route handlers. The errors indicate potential issues with the encryption key or data integrity:
  ```
  [1] Decryption failed: Error: Unsupported state or unable to authenticate data
  [1] Failed to decrypt credentials for connection ...: Error: Decryption failed. Data may be tampered or key is incorrect.
  [1] Decryption failed: Error: Unsupported state or unable to authenticate data
  [1] Failed to decrypt Google Health credentials for conn ...: Error: Decryption failed. Data may be tampered or key is incorrect.
  ```
- **Lack of Refresh Logic:** The backend currently lacks the mechanism to detect expired access tokens and use the refresh token to obtain new ones.

## Previous Work (Dashboard Caching & Refactor - Completed 2025-04-03 ~3:28 PM)

### Goal: Implement Local Caching, Refactor Dashboard Component, Improve Panel UX

Work involved implementing local storage caching for dashboard layouts, refactoring the large `Dashboard.tsx` component, and refining panel interaction UX.

### Architecture Decisions:

- **Backend API:** Node.js/Express backend service (`/api`). (No change)
- **Database:** Supabase (PostgreSQL).
  - `user_dashboard_layouts` table structure unchanged.
  - `manual_todo_items` table structure unchanged.
- **Authentication:** Frontend Supabase Auth, Backend JWT verification. (No change)
- **Google OAuth:** Passport.js handles Google OAuth flow. (No change)
- **Data Flow:**
  - Frontend contexts fetch from backend API. (No change)
  - Dashboard layouts fetched from/saved to `/api/dashboards/:name` endpoints. (No change)
  - **Added Local Storage Caching:** Dashboard layouts ('default', 'mobile') and last sync time are now cached in `localStorage`.
- **RLS Handling:** Backend middleware uses request-scoped Supabase client. (No change)
- **Task Breakdown:** Google Gemini API integration unchanged.
- **Notifications:** `sonner` library integration unchanged.
- **API Dev Environment (Windows):** Setup unchanged.

### Implementation Progress:

1.  **PWA Update Button (`src/components/DashboardHeader.tsx`):** (Previous work - No change)
2.  **Supabase Setup:** (Previous work - No change)
3.  **Backend API (`/api`):** (Previous work - No change)
4.  **Frontend (`/src`):**
    - **Implemented Dashboard Caching (`src/components/Dashboard.tsx`, `src/components/dashboard/utils.ts`, `useDashboardLayout` hook):** Implemented caching logic using localStorage, including staleness checks and fetch-on-demand rules.
    - **Refactored `Dashboard.tsx`:** Extracted types, constants, utils, layout logic (hook), grid rendering, and edit indicator into separate modules within `src/components/dashboard/`. Simplified main component.
    - **Refactored `LeftSidebar.tsx`:** Moved panel state management and rendering into the sidebar component.
    - **Improved Panel UX:** Added overlay, responsive max-widths, and edit mode interaction feedback (shake + toast).
    - **CSS Updates (`src/index.css`):** Added `.indicator-shake` class and animation.
    - **Bug Fixes:** Addressed issues related to dashboard fetching when opening panels and returning to desktop view after mobile edit. Fixed indicator shake positioning.
5.  **Testing:**
    - Previous functionalities confirmed working.
    - Caching, refactoring, and UX improvements manually tested and confirmed working as intended.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - **Investigate and fix Google credential decryption errors.**
  - **Implement token refresh logic for Google Calendar & Google Health tokens.**
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
  - **Add user feedback (e.g., toasts) for layout save/load errors.**
