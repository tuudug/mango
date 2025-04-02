# Current Progress: API & TodoList Refactoring, AI Context (As of 2025-04-03 ~1:10 AM)

## Goal: Refactor Backend API, Improve TodoList Component Structure & Functionality

Recent work focused on refactoring backend API routes for better organization and significantly improving the TodoList widget's structure, reordering logic, and AI breakdown context.

## Architecture Decisions:

- **Backend API:** Node.js/Express backend service (`/api`). (No change)
- **Database:** Supabase (PostgreSQL). Added `parent_id`, `level`, `position` columns to `manual_todo_items`. (No change)
- **Authentication:** Frontend Supabase Auth, Backend JWT verification. (No change)
- **Google OAuth:** Passport.js handles Google OAuth flow. (No change)
- **Data Flow:** Frontend contexts fetch from backend API. (No change)
- **RLS Handling:** Backend middleware uses request-scoped Supabase client. (No change)
- **Task Breakdown:** Google Gemini API (`gemini-2.0-flash-lite`) integrated via `api/src/services/geminiService.ts`. **Prompt now includes parent task context when breaking down sub-tasks.**
- **Notifications:** `sonner` library integrated via `ToastContext`. (No change)
- **API Dev Environment (Windows):** Added `concurrently` and `nodemon` with `nodemon.json` config to `api` for reliable `npm run dev` script execution. Added `watchOptions` to `api/tsconfig.json`.

## Implementation Progress:

1.  **Supabase Setup:**
    - Tables `data_source_connections`, `manual_calendar_events`, `manual_health_entries`, `manual_todo_items` exist with nesting/ordering columns.
    * **Added `move_todo_item` PostgreSQL function** to atomically handle moving items up/down within siblings. Granted execute permissions to `authenticated` and `service_role`.
2.  **Backend API (`/api`):**
    - **Refactored API Routes:**
      - Split `health`, `calendar`, and `auth` route handlers into separate files within respective subdirectories (`api/src/routes/health/`, `api/src/routes/calendar/`, `api/src/routes/auth/`).
      - Created shared type files (`api/src/types/health.ts`, `api/src/types/calendar.ts`).
      - Updated main route files (`health.ts`, `calendar.ts`, `auth.ts`) to import and use new handlers.
    - **Updated Todo API Routes:**
      - **`POST /manual/:itemId/breakdown`:** Now accepts optional `parentTitle` in request body. Passes both current title and parent title (if available) to `geminiService`.
      - **Added `PUT /manual/:itemId/move`:** New endpoint calling the `move_todo_item` DB function to handle moving items up/down.
    - **Updated `api/src/services/geminiService.ts`:**
      - Modified `breakdownTask` function to accept optional `parentTitle`.
      - Updated prompt logic to include parent context when `parentTitle` is provided.
    - **Development Environment:**
      - Installed `concurrently` and `nodemon`.
      - Added `nodemon.json` configuration.
      - Updated `dev` script in `package.json` to use `concurrently` and `nodemon`.
      - Added `"watchOptions": { "watchFile": "fixedPollingInterval" }` to `tsconfig.json`.
3.  **Frontend (`/src`):**
    - **Refactored `TodoListWidget`:**
      - Moved core logic into `src/widgets/TodoList/` directory.
      - Original `src/widgets/TodoListWidget.tsx` now just re-exports the new implementation.
      - **`TodoList/index.tsx`:** Manages top-level state (expansion, drag), renders top-level items, handles DnD context and top-level input/progress. Collapses items on drag start.
      - **`TodoList/TodoListItem.tsx`:** Renders individual items, handles recursive rendering of children, uses `useSortable` (disabled for nested), calls context actions, uses `useTodoItemEditing` hook, conditionally disables collapse animation during drag.
      - **`TodoList/TodoItemActions.tsx`:** Extracted component for action buttons (Edit, Delete, Add Sub, Breakdown, Move Up/Down, Drag Handle), conditionally renders buttons based on level and state.
      - **`TodoList/TodoItemEditForm.tsx`:** Extracted component for inline editing input.
    - **Updated `TodosContext.tsx`:**
      - `breakdownTodo` function now accepts the full `todo` object, finds parent title for level 1 items, and sends `parentTitle` in the API request body.
      - **Added `moveTodo` function:** Handles API calls and optimistic updates for moving items up/down via buttons.
    - **Updated Reordering Logic:**
      - Drag-and-drop (`dnd-kit`) is now only enabled for top-level (level 0) items.
      - Move Up/Down buttons added for nested items (level 1 & 2).
4.  **Testing:**
    - Previous functionalities confirmed working.
    - **Manual testing confirms:** API route refactoring successful, TodoList component refactoring successful, AI breakdown now uses parent context, Move Up/Down buttons work for nested items, Drag-and-drop works only for top-level items, items collapse on drag start without interfering animation.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - Implement token refresh logic for **Google Health** tokens.
  - Implement disconnect logic/route for **Google Health**.
  - Refine data merging logic (e.g., summing vs. overwriting) for Health steps.
  - Add support for other health data types (sleep, weight, etc.) from Google Health.
  - Add support for external Todo providers (e.g., Google Tasks).
- **Frontend:**
  - Refine loading/error states for non-calendar/health/todo widgets.
  - Add UI for managing other health data types (sleep, weight).
  - Add UI for connecting/disconnecting other potential external providers (Google Tasks).
  - Implement confirmation dialogs before deleting data (especially parent todos).
  - **Implement UI for Todo filtering/sorting and disable Move/DnD when active.**
  - **Make newly added sub-items enter edit mode automatically?**
  - **Persist expanded/collapsed state (e.g., in localStorage or backend)?**
