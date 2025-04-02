# Current Progress: Todo Enhancements & PWA Updates (As of 2025-04-02 ~8:55 PM)

## Goal: Enhance Todo Functionality and Improve Core App Experience

Recent work focused on significantly upgrading the Todo list capabilities and implementing essential PWA features.

## Architecture Decisions:

- **Backend API:** A separate Node.js/Express backend service (located in `/api`) handles all interactions with external providers, manages authentication tokens securely, and provides a clean API for the frontend. (No change)
- **Database:** Supabase (PostgreSQL) used. Added `parent_id`, `level`, and `position` columns to `manual_todo_items` to support nesting and ordering. Foreign key with cascade delete added for `parent_id`. Index added for `(user_id, parent_id, position)`.
- **Authentication:** Frontend Supabase Auth, Backend JWT verification. (No change)
- **Google OAuth:** Passport.js handles Google OAuth flow. (No change)
- **Data Flow:** Frontend contexts fetch from backend API. (No change)
- **RLS Handling:** Backend middleware uses request-scoped Supabase client for RLS enforcement. (No change)
- **Task Breakdown:** Google Gemini API (`gemini-2.0-flash-lite`) integrated via a backend service (`api/src/services/geminiService.ts`) for AI-powered sub-task generation. Input sanitization added.
- **Notifications:** `sonner` library integrated via `ToastContext` for user feedback.

## Implementation Progress:

1.  **Supabase Setup:**
    - Tables `data_source_connections`, `manual_calendar_events`, `manual_health_entries` exist.
    * **Added `parent_id` (UUID, nullable, FK -> manual_todo_items.id ON DELETE CASCADE), `level` (INTEGER, NOT NULL, DEFAULT 0), `position` (INTEGER, NOT NULL) columns to `manual_todo_items`.**
    * **Updated index on `manual_todo_items` to `(user_id, parent_id NULLS FIRST, position ASC)`.**
    * **Reset initial `position` values for existing top-level todos.**
2.  **Backend API (`/api`):**
    - Existing setup for Express, Supabase client, auth middleware, error handling.
    - **Installed `@google/generative-ai` SDK.**
    * **Added `GOOGLE_GEMINI_API_KEY` to `.env`.**
    * **Created `api/src/services/geminiService.ts`:**
      - Initializes Gemini client.
      - Contains `breakdownTask` function with refined prompt and response parsing logic.
    - **Refactored `api/src/routes/todos.ts`:**
      - **Split route handlers into separate files in `api/src/routes/todos/`.**
      - Main `todos.ts` now imports and uses these handlers.
    - **Updated Todo API Routes (`api/src/routes/todos/*.ts`):**
      - `GET /`: Selects new columns (`parent_id`, `level`, `position`), orders by `level`, then `position`.
      - `POST /manual`: Handles optional `parent_id`, calculates `level`, calculates relative `position`.
      - **Added `PUT /manual/:itemId`:** Handles editing the `title`.
      - **Updated `PUT /manual/reorder`:** Accepts `parentId` (nullable) and `orderedIds`, updates `position` for siblings only.
      - **Added `POST /manual/:itemId/breakdown`:** Calls `geminiService.breakdownTask`, handles responses (including `<need_more_context>`), inserts generated sub-tasks with correct `parent_id`, `level`, and `position`.
      - Updated `DELETE /manual/:itemId` (no code change needed due to DB cascade).
      - Ensured correct route definition order (specific before parameterized).
3.  **Frontend (`/src`):**
    - Existing setup for Supabase client, Auth, other contexts.
    * **Installed `sonner` library.**
    * **Created `ToastContext` (`src/contexts/ToastContext.tsx`) and `ToastProvider`.**
    * **Wrapped App in `ToastProvider` (`src/main.tsx`).**
    * **Updated `TodosContext` (`src/contexts/TodosContext.tsx`):**
      - Added `parent_id`, `level`, `isNew` to `TodoItem` interface.
      - Added `NestedTodoItem` interface and `buildTree` helper.
      - Provides `nestedTodos` state via `useMemo`.
      - Updated `addTodo` signature/logic for `parentId`.
      - Added `editTodo` function with optimistic update.
      - Updated `reorderTodos` signature/logic for `parentId` and optimistic update.
      - Added `breakdownTodo` function calling the API, handling specific errors with toasts, merging results with `isNew` flag for animation.
      - Integrated `useToast` for error reporting in API call catch blocks.
      - Updated `deleteTodo` optimistic update to remove descendants.
    * **Updated `TodoListWidget` (`src/widgets/TodoList/index.tsx` & `TodoListItem.tsx`):**
      - **Refactored into `index.tsx` (main component) and `TodoListItem.tsx` (recursive item component).**
      - Uses `nestedTodos` for rendering.
      - `TodoListItem` handles recursive rendering with indentation (`marginLeft`) and level-based left border.
      - Added Expand/Collapse button (`ChevronDown`/`ChevronRight`) with state managed in parent, conditional rendering, and animation.
      - Added "Add sub-item" button (`PlusCircle`) calling `addTodo` with parent ID.
      - Added "Magic breakdown" button (`Sparkles`) calling `breakdownTodo`.
      - Added "Edit" button (`Pencil`) toggling an input field for inline editing, calling `editTodo` on save.
      - Integrated `@dnd-kit/sortable` for drag-and-drop reordering (restricted to siblings within the same level).
      - Moved drag handle (`GripVertical`) to action buttons group.
      - Refined action button visibility (show on hover, respect disabled state).
    * **PWA Update Check:**
      - Configured `vite-plugin-pwa` (`vite.config.ts`) for `'prompt'` update strategy.
      - Added update check button/logic to `DashboardHeader.tsx` using `useRegisterSW`.
      - Added page reload on update confirmation.
      - Fixed related TS/ESLint issues.
    * **Dynamic Version:** Updated `DashboardHeader.tsx` to display version from `changelog.json`.
    * **Changelog Badge:** Updated `LeftSidebar.tsx` to use `compareVersions` utility and read latest version from `changelog.json`.
    * **Custom Scrollbar:** Added `custom-scrollbar-yellow` class to `TodoListWidget` scrollable area and defined styles (3px width) in `src/scrollbars.css`, imported in `main.tsx`.
4.  **Testing:**
    - Previous functionalities confirmed working.
    - **Manual testing confirms:** Todo editing, reordering (siblings), adding sub-items, AI breakdown (placeholder & Gemini), expand/collapse, animations, toast notifications, PWA update prompt, dynamic version display, changelog badge logic, custom scrollbar.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - Implement token refresh logic for **Google Health** tokens.
  - Implement disconnect logic/route for **Google Health**.
  - Refine data merging logic (e.g., summing vs. overwriting) for Health steps.
  - Add support for other health data types (sleep, weight, etc.) from Google Health.
  - Add support for external Todo providers (e.g., Google Tasks).
  - Consider database function/trigger for atomic reordering if needed.
- **Frontend:**
  - Refine loading/error states for non-calendar/health/todo widgets.
  - Add UI for managing other health data types (sleep, weight).
  - Add UI for connecting/disconnecting other potential external providers (Google Tasks).
  - Implement confirmation dialogs before deleting data (especially parent todos).
  - **Refine DnD for nested lists (allow dragging between levels/parents if desired - currently disabled).**
  - **Implement UI for Todo filtering/sorting and disable DnD when active.**
  - **Make newly added sub-items enter edit mode automatically?**
  - **Persist expanded/collapsed state (e.g., in localStorage or backend)?**
