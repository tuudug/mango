# Current Progress: Data Source Abstraction & Backend API (As of 2025-04-01 ~2:05 AM)

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
    - Configured Passport Google OAuth 2.0 strategy (`api/src/config/passport.ts`) (placeholders remain).
    - Created Google OAuth authentication routes (`api/src/routes/auth.ts`).
    - Implemented `ensureAuthenticated` middleware (`api/src/routes/calendar.ts`) to verify JWT and create/attach a **request-scoped Supabase client (`req.supabase`)**.
    - Created Calendar API routes (`api/src/routes/calendar.ts`):
      - `GET /api/calendar`: Fetches manual events using the **request-scoped client** (respecting RLS). Placeholder for fetching Google events.
      - `POST /api/calendar/manual`: Creates manual events using the **request-scoped client** (respecting RLS), after ensuring the manual connection record exists (using `supabaseAdmin`).
      - `DELETE /api/calendar/manual/:eventId`: Deletes manual events using the **request-scoped client** (respecting RLS).
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
    - Refactored `CalendarContext` (`src/contexts/CalendarContext.tsx`) to use backend API and send auth token.
    - Updated `CalendarDataSource` component (`src/components/datasources/CalendarDataSource.tsx`).
    - Configured Vite proxy (`vite.config.ts`).
4.  **Testing:**
    - **Manual calendar event add/delete functionality confirmed working** via frontend UI, backend API, and Supabase, using frontend Supabase authentication and the secure RLS-respecting backend approach.

## Remaining TODOs / Next Steps:

- **Backend:**
  - Implement Google Calendar API fetching logic in `GET /api/calendar`.
  - Implement token encryption/decryption for `data_source_connections.credentials`.
  - Implement token refresh logic for Google OAuth tokens.
  - Replace placeholder user linking in Passport config (`api/src/config/passport.ts`).
  - Implement proper error handling (e.g., global Express error handler).
- **Frontend:**
  - Build the UI for connecting/disconnecting Google Calendar.
  - Refine loading/error states in UI components.
  - Implement visual differentiation for events based on `sourceInstanceId`.
  - Refactor other contexts/components (`Health`, `Todos`) if needed.
