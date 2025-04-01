# Current Progress: Data Source Abstraction & Backend API (As of 2025-04-01 ~2:40 PM)

## Goal: Abstract Data Sources and Integrate External Providers

The objective is to refactor the application to handle data sources (like Calendar, Health) in a more abstract way, allowing integration with external providers (starting with Google Calendar) alongside manual entry.

## Architecture Decisions:

- **Backend API:** A separate Node.js/Express backend service (located in `/api`) will handle all interactions with external providers, manage authentication tokens securely, and provide a clean API for the frontend.
- **Database:** Supabase (PostgreSQL) will be used by the backend to store user-specific configurations, encrypted OAuth tokens, and manually entered data.
- **Authentication:**
  - **Frontend:** Supabase Auth (email/password initially) will manage user login/signup directly on the frontend. The frontend will send the user's Supabase JWT (access token) to the backend API with requests.
  - **Backend:** An `ensureAuthenticated` middleware will verify the incoming JWT using Supabase Auth (`supabaseAdmin.auth.getUser(token)` for reliability server-side) to identify the user making the request.
  - **Google OAuth:** Passport.js with `passport-google-oauth20` will handle the Google OAuth flow on the backend for connecting Google Calendar. Tokens will be stored (encrypted) in Supabase.
- **Data Flow:**
  - Frontend contexts (e.g., `CalendarContext`) will fetch data from the backend API (`/api/...`), sending the user's JWT.
  - The backend API will fetch data from the relevant sources (e.g., Google Calendar API, Supabase `manual_calendar_events` table) based on the authenticated user's connections, merge the data, add a `sourceInstanceId`, and return it to the frontend.
  - Manual data entry/deletion from the frontend UI will call specific backend API endpoints (`POST /api/calendar/manual`, `DELETE /api/calendar/manual/:eventId`), sending the user's JWT.
- **RLS Handling:**
  - Backend middleware verifies the user JWT and creates a **request-scoped Supabase client** initialized with the user's token (`req.supabase`).
  - Database operations on user-specific tables (e.g., `manual_calendar_events` SELECT, INSERT, DELETE) are performed using this **request-scoped client**, ensuring RLS policies (`auth.uid() = user_id`) are correctly enforced by Supabase.
  - Operations requiring elevated privileges (like reading credentials from `data_source_connections` or creating the initial `manual_calendar` connection record) use the `supabaseAdmin` client (service role key).

## Implementation Progress:

1.  **Supabase Setup:**
    - Project created.
    - Tables `data_source_connections` and `manual_calendar_events` created with columns (including `is_all_day` added to `manual_calendar_events`) and RLS policies checking `auth.uid() = user_id`.
    - Dummy user created manually for testing.
2.  **Backend API (`/api`):**
    - Initialized Node.js/Express project with TypeScript.
    - Installed dependencies: `express`, `dotenv`, `@supabase/supabase-js`, `passport`, `passport-google-oauth20`, `express-session`, `googleapis`.
    - Configured `tsconfig.json`.
    - Created `.env` file with credentials.
    - Initialized Supabase clients (`supabaseAdmin`) in `api/src/supabaseClient.ts`.
    - Set up Express server (`api/src/server.ts`) with session middleware and Passport initialization.
    - Configured Passport Google OAuth 2.0 strategy (`api/src/config/passport.ts`) for Calendar and Health, including user linking via session.
    - Created Google OAuth authentication routes (`api/src/routes/auth.ts`) for Calendar and Health, including session login bridge.
    - Refactored `ensureAuthenticated` middleware into `api/src/middleware/auth.ts`.
    - Implemented token encryption/decryption utils (`api/src/utils/crypto.ts`).
    - Implemented global error handler in `api/src/server.ts`.
    - Created Calendar API routes (`api/src/routes/calendar.ts`):
      - `GET /api/calendar`: Fetches and merges manual & Google Calendar events (past 7 / next 30 days), handles token refresh/decryption, returns connection status.
      - `POST /api/calendar/manual`: Creates manual events.
      - `DELETE /api/calendar/manual/:eventId`: Deletes manual events.
    - Created Health API routes (`api/src/routes/health.ts`):
      - `GET /api/health`: Fetches manual & Google Health steps (last 7 days), aggregates steps, returns connection status.
      - `POST /api/health/manual`: Creates manual health entries.
      - `DELETE /api/health/manual/:entryId`: Deletes manual health entries.
    - Created Todos API routes (`api/src/routes/todos.ts`):
      - `GET /api/todos`: Fetches manual todos.
      - `POST /api/todos/manual`: Creates manual todos.
      - `PUT /api/todos/manual/:itemId/toggle`: Toggles todo completion.
      - `DELETE /api/todos/manual/:itemId`: Deletes manual todos.
3.  **Frontend (`/src`):**
    - Installed `@supabase/supabase-js`.
    - Created frontend Supabase client (`src/lib/supabaseClient.ts`).
    - Created root `.env` file for frontend Supabase keys.
    - Created `AuthContext` (`src/contexts/AuthContext.tsx`).
    - Wrapped `App` in `AuthProvider` (`src/main.tsx`).
    - Created `LoginForm` and `SignupForm` components.
    - Updated `App.tsx` for conditional rendering (Auth vs Dashboard).
    - Updated `UserProfilePanel.tsx` to use `useAuth` for logout.
    - Defined shared types in `src/types/datasources.ts`.
    - Refactored `CalendarContext` (`src/contexts/CalendarContext.tsx`) to use backend API, handle connection status, add throttled refresh.
    - Refactored `HealthContext` (`src/contexts/HealthContext.tsx`) to use backend API, handle connection status.
    - Refactored `TodosContext` (`src/contexts/TodosContext.tsx`) to use backend API, add throttled refresh.
    - Updated `CalendarDataSource` component (`src/components/datasources/CalendarDataSource.tsx`) with connect/disconnect UI.
    - Updated `HealthDataSource` component (`src/components/datasources/HealthDataSource.tsx`) with connect/disconnect UI and delete functionality.
    - Updated `TodosDataSource` component (`src/components/datasources/TodosDataSource.tsx`) to use refactored context.
    - Updated `DailyCalendarWidget` and `MonthCalendarWidget` to display times, separate all-day events, add day navigation, and use subtle loading bar.
    - Updated `StepsTrackerWidget` to use refactored context.
    - Added `AuthSuccessPage` and `AuthFailurePage` components and routing in `App.tsx`.
    - Configured Vite proxy (`vite.config.ts`).
4.  **Testing:**
    - Manual calendar event add/delete/toggle functionality confirmed working.
    - Google Calendar connection/disconnection flow confirmed working.
    - Google Calendar event fetching confirmed working.
    - Manual health entry add/delete functionality confirmed working.
    - Google Health connection flow confirmed working.
    - Google Health step fetching confirmed working.
    - Manual todo add/delete/toggle functionality confirmed working.

## Remaining TODOs / Next Steps (Backburner):

- **Backend:**
  - Implement token refresh logic for **Google Health** tokens.
  - Implement disconnect logic/route for **Google Health**.
  - Refine data merging logic (e.g., summing vs. overwriting) for Health steps.
  - Add support for other health data types (sleep, weight, etc.) from Google Health.
  - Add support for external Todo providers (e.g., Google Tasks).
- **Frontend:**
  - Refine loading/error states for non-calendar/health widgets.
  - Add UI for managing other health data types (sleep, weight).
  - Add UI for connecting/disconnecting other potential external providers (Google Tasks).
  - Implement confirmation dialogs before deleting data.
