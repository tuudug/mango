# Mango App: Project Checklist

Here's a checklist based on the project brief ideas:

## Core Concept

- [ ] **"Yuzu" Entity:** A virtual entity that motivates and guides the user.
  - [ ] LLM-Powered: Utilizing LLMs for interaction. (Basic interaction planned for v0.2)
  - [x] UI Mockup: Basic panel exists (`YuzuPanel.tsx`), includes message input.

## Data Sources & Management

These components handle the interaction and persistence of core application data via React Contexts. **Configuration for data source sidebar buttons (icon, label) is now centralized in `src/lib/dataSourceConfig.ts`.** **API calls within data source contexts are now centralized using `src/lib/apiClient.ts`.**

- [x] **Calendar Data Source (`CalendarDataSource.tsx`):** Manages calendar events (add, delete, view) using `CalendarContext`.
  - **[x] Backend:** Fix token decryption errors. (**Resolved: Incorrect ENV VAR**)
  - **[x] Backend:** Implement refresh token logic. (**Verified: Existing logic works after decryption fix**)
- [x] **Health Data Source (`HealthDataSource.tsx`):** Manages daily step counts (add, update, view) using `HealthContext`.
  - **[x] Backend:** Fix token decryption errors. (**Resolved: Incorrect ENV VAR**)
  - **[x] Backend:** Implement refresh token logic. (**Added: Missing handler in API route**)
  - **[x] Backend:** Fix disconnect logic. (**Fixed: Handler now uses provider from request body**)
  - **[x] Backend:** Added API routes (`/api/health/settings`) for managing `daily_steps_goal` **and `weight_goal`**. (**Added**)
  - **[x] Frontend:** Added UI in panel to configure `daily_steps_goal` **and `weight_goal`**. (**Added**)
  - **[x] Frontend:** Manual step/weight entry forms now default to current date. (**Added**)
- [x] **Todos Data Source (`TodosDataSource.tsx`):** Manages todo items (add, delete, toggle completion) using `TodosContext`.
  - **[x] Editing:** Added ability to edit todo item text.
  - **[x] Reordering:** Top-level items use drag-and-drop; nested items use Move Up/Down buttons.
  - **[x] Sub-items:** Added support for nested sub-items (up to 2 levels).
  - **[x] AI Breakdown:** Added "magic" button to generate sub-tasks using Gemini. **Now includes parent context.**
- [x] **Finance Data Source (`FinanceDataSource.tsx`):** Manages manual finance entries and settings using `FinanceContext`. **Context logic moved to `src/contexts/FinanceContext.tsx`. Panel component renamed/moved.**
  - **[x] Database:** Added `manual_finance_settings` and `manual_finance_entries` tables.
  - **[x] Backend:** Added API routes (`/api/finance`) for settings and entries (GET, PUT, POST, DELETE).
  - **[x] Frontend:** Created context, settings panel (in sidebar), expense entry modal. **Modal moved to `src/components/`.**
- [x] **Pomodoro Context (`PomodoroContext.tsx`):** Manages global Pomodoro state (idle, work, break).
- [x] **Ambience Context (`AmbienceContext.tsx`):** Manages background audio playback state and volume using Web Audio API.
- [x] **Habits Context (`HabitsContext.tsx`):** Manages habit definitions and entries.
- [x] **Quests Context (`QuestsContext.tsx`):** (Foundation v0.2.1 done) Manages quest state (available, active, claimable, completed, cancelled) and interactions. **LLM Generation v0.2.2 added.**

## Key Features

### Quests (Planned for v0.2.1 - v0.2.3)

- [x] **Foundation (v0.2.1):**
  - [x] Database Schema: `quests`, `quest_criteria`, `user_quest_state` tables.
  - [x] Backend API: Basic routes for activate, cancel, claim (`POST /api/quests/...`).
  - [x] Frontend: New `QuestsPanel.tsx` in sidebar, `QuestsContext.tsx`.
  - [x] Manual Claiming: User manually claims completed quests via button.
  - [x] Basic XP Award: Claiming triggers XP gain via `POST /api/user/progress/add-xp`. **(Refactored in v0.2.2)**
- [x] **LLM Generation (v0.2.2):**
  - [x] Backend: `generateQuestsForUser` function using LLM (Gemini) and user data context. **(Integrated actual Gemini call)**
  - [x] Backend: `POST /api/quests/generate` endpoint with timing/reset logic (daily/weekly). **(Basic daily reset implemented, weekly TODO)**
  - [x] LLM Prompting: Craft prompt for generating quests + criteria + XP rewards in JSON format. **(Initial prompt implemented)**
  - [x] LLM Validation: Parse, validate, and map LLM response (e.g., habit names to IDs). **(Implemented)**
  - [x] Frontend: Add Generate/Reset buttons to `QuestsPanel`. **(Implemented)**
- [x] **Automation & Progress Tracking (v0.2.3):**
  - [x] Backend: `updateQuestProgress` service to track user actions (habit checks, steps, finance, todos). **(Pomodoro deferred)**
  - [x] Backend: Integrate `updateQuestProgress` calls into existing API endpoints (Habits, Todos, Health, Finance). **(Steps tracking fixed by correcting handler config)**
  - [x] Backend: Automatically update criteria `current_progress` and `is_met`.
  - [x] Backend: Automatically update quest `status` to 'claimable' when all criteria met. **(Includes logging & small delay)**
  - [x] Frontend: Display criteria progress (`current_progress / target_count`) in `QuestsPanel`.
  - [x] Frontend: Implement data refresh mechanism (on focus, after relevant actions with delay) for quest progress updates.
  - [x] Frontend: Added quest expiry display (time remaining / "Expired" badge) and logic (disable claim, show cancel) based on `activated_at`.

### Yuzu

- [x] **Basic Interaction (v0.2.5):**
  - [x] Backend: `POST /api/yuzu/message` endpoint (LLM integrated, context-aware). **Includes conversation history (last 10 msgs) and user data context (progress, quests, todos, habits, health, finance, calendar).**
  - [x] Frontend: Implemented chat UI with history, suggestions, and API integration in `YuzuPanel.tsx`. **Includes initial static suggestions and dynamic LLM-generated suggestions.**
- [ ] **Personality/Tone Customization (via Paths):**
  - [ ] Unlock Casual tone.
  - [ ] Unlock Formal tone.
  - [ ] Unlock "Gen Z" / Informal tone.
- [ ] **Availability Limits / Upgrades (via Paths / Subscription):**
  - [ ] Base limit for free users.
  - [ ] Unlock increased limit (Path node?).
  - [ ] Unlimited interaction for subscribers.

### Trackables

- [x] User-defined statistics (weight, steps, etc.). **(Weight tracking added)**
- [x] Dashboard display for tracked stats (Partially done - widgets exist, data is static for some).
- [x] **Weight Tracking:** (**New**)
  - [x] Weight Goal setting in Health Data Source panel.
  - [x] Manual weight entry in Health Data Source panel (defaults to current date).
  - [x] Weight Tracker Widget (`WeightTrackerWidget.tsx`) added:
    - Displays current weight, goal, and difference.
    - Includes quick-add button opening a modal (`WeightEntryModal.tsx`).
    - Shows minimalistic area chart of weight trend (last 30 days, purple color, gradient fill, solid grid lines).
- [x] **Finance Tracking:**
  - [x] Daily Allowance Widget (`DailyAllowanceWidget.tsx`) - Shows remaining daily budget. **Layout improved.**
  - [x] Expenses Report Widget (`ExpensesReportWidget.tsx`) - Shows weekly spending bar chart.
- [x] **Habits Tracking:**
  - [x] Habits Checklist Widget (`HabitsListWidget.tsx`) - Log daily completion. **Layout made more compact. Added uncheck support for once-daily habits. Enhanced to show current/longest streaks inline, ThumbsUp/Down icons for habit type, line-through for completed daily habits, live count updates for multi-check habits, and tiered visual borders (sparking/glowing/fiery) for positive habit streaks.**
  - [x] Habit Heatmap Widget (`HabitHeatmapWidget.tsx`) - Visualize consistency. **Configurable (Refactored). Refactored to 30-day grid view. Layout made more compact, minimum size reduced.**
  - [x] Habit Streaks Widget (`HabitStreakWidget.tsx`) - Track current/longest streaks. **Configurable (Refactored). Layout made more compact (horizontal).**

### Progression System

- [ ] Virtual currency rewards.
- [x] Leveling up (XP gain) - **Implemented backend & frontend display (v0.2.2)**
  - [x] Backend: `POST /api/user/progress/add-xp` endpoint. **(Implemented & Refactored in v0.2.2)**
  - [x] Frontend: Display actual Level/XP from `AuthContext`. **(Implemented in v0.2.2)**
- [x] **Paths System:**
  - [x] Concept: User selects one linear path at a time; XP contributes to path progress. Switching paths resets progress towards the _next_ item on the previous path.
  - [x] UI Mockup: Implemented as a sliding panel (`PathsPage.tsx`) showing defined paths, active path indication (star icon), progress bar for active path, unlock status (lock/check icon), XP costs, and path switching confirmation.
  - [ ] Path Definition: Finalize items, order, XP costs, level requirements per path.
  - [x] Implementation: Logic for path selection, progress tracking, unlocking items (state managed in `LeftSidebar.tsx` now, saved to localStorage - _Path state only_).
- [x] **XP Gain Mechanism:** Primarily via claiming completed Quests. **(Implemented in v0.2.1/v0.2.2)**
- [ ] Widgets unlocked/customized through app usage (via Paths / Shop).
- [ ] **Shop:**
  - [ ] Concept: Purchase widget themes/styles.
  - [ ] Currency: Use virtual currency.
  - [ ] Items: Define specific themes/styles.
  - [ ] Implementation: Build the UI and logic.

### Customizable Dashboard

**Configuration for widgets (types, default layouts, metadata like icons/colors/groups) is now centralized in `src/lib/widgetConfig.ts`.**

- [x] Central hub for progress and planning (`Dashboard.tsx`).
- [x] Add/Move/Resize widgets (`react-grid-layout` integration).
- [x] **Widget Adding:** Replaced drag-and-drop from toolbox with "+" button click; widgets auto-place in first available slot.
- [x] **Layout persistence (Database):**
  - [x] Backend API (`/api/dashboards`) created to GET/PUT layouts.
  - [x] Supabase table (`user_dashboard_layouts`) created.
  - [x] Frontend (`useDashboardLayout` hook) fetches/saves layouts via API.
- [x] **Layout Caching (Local Storage):**
  - [x] Layouts ('default', 'mobile') cached to reduce API calls.
  - [x] Last sync time stored to check cache staleness (12hr).
  - [x] Cache used on initial load; stale cache updated on focus.
  - [x] Fetches forced on entering/exiting edit mode or switching edit target.
  - **[x] Background Fetching:** Implemented background fetching with comparison to avoid unnecessary re-renders.
- [x] **Mobile Layout Support:**
  - [x] Separate 'mobile' layout fetched/saved via API & cached.
  - [x] Automatic loading of 'mobile' or 'default' layout based on screen width (initial load). **Logic centralized in `src/components/dashboard/utils.ts`.**
  - [x] Mobile Edit Mode UI implemented (toggle in edit bar, narrow preview, filtered toolbox).
  - [x] Mobile edit preview uses separate grid instance (`DashboardGrid.tsx`).
  - **[x] Mobile Edit Disabled:** Edit mode button in sidebar is now disabled (shows toast) on mobile viewports. **Logic centralized in `src/components/dashboard/utils.ts`.**
- [ ] **Multiple Named Dashboards:** (Future - requires UI for management)
- [x] **Refined Widget List & Categories (Used for Paths):**
  - **Productivity:**
    - [x] To-do List (`TodoListWidget.tsx` -> `TodoList/index.tsx`) - **Enhanced with Edit, Reorder (DnD/Buttons), Sub-items, AI Breakdown (w/ Context), Tooltips**
    - [x] Month Calendar (`MonthCalendarWidget.tsx`)
    - [x] Daily Calendar (`DailyCalendarWidget.tsx`)
    - [x] Goal Tracker (`GoalTrackerWidget.tsx`)
    - [x] Pomodoro (`PomodoroWidget.tsx`) - **Added basic timer, overflow count-up, progress bar, global banner (work phase only), notification sound.**
      - [ ] _Upgrade:_ Weekly View/Stats
      - [ ] _Upgrade:_ Monthly View/Stats
      - [ ] _Upgrade:_ Advanced Reports
  - **Health & Wellness:**
    - [x] Steps Tracker (`StepsTrackerWidget.tsx`)
      - [x] Dynamic mini/full view based on size.
      - [x] Replaced custom chart with `recharts`, added goal line, week navigation. **Goal line now uses configurable `daily_steps_goal` from Health settings.**
    - [x] Weight Tracker (`WeightTrackerWidget.tsx`) - **Added**
    - [x] Habit Graph (`HabitGraphWidget.tsx`) - _(Deprecated by Heatmap/Streaks?)_
    - [x] Habits Checklist (`HabitsListWidget.tsx`)
    - [x] Habit Heatmap (`HabitHeatmapWidget.tsx`)
    - [x] Habit Streaks (`HabitStreakWidget.tsx`)
    - [ ] Sleep Widget (_Separated from Steps_) (`SleepStepWidget.tsx` needs refactor)
      - [ ] _Upgrade:_ Sleep Analysis
      - [ ] _Upgrade:_ Daily Routine Generator
    - [ ] Air Quality Widget
  - **Finance:** (**New Category**)
    - [x] Daily Allowance (`DailyAllowanceWidget.tsx`) - **Layout improved, currency symbol prioritized.**
    - [x] Expenses Report (`ExpensesReportWidget.tsx`)
  - **Mindfulness/Focus:** (**New Category**)
    - [x] Journaling Widget (`JournalWidget.tsx`)
    - [x] Affirmation Widget (`AffirmationWidget.tsx`) - **Added random affirmations, clickable text, gradient style.**
    - [x] Ambience (`AmbienceWidget.tsx`) - **Added basic rain sound (FLAC via Web Audio API), play/pause, volume, attribution modal, raindrop animation.**
      - [ ] _Unlock:_ White Noise
      - [ ] _Upgrade:_ Rain Sounds (More variety?)
      - [ ] _Upgrade:_ Wind Sounds
      - [ ] _Upgrade:_ LoFi Music
      - [ ] _Upgrade:_ Bird Sounds
      - [ ] _Upgrade:_ Shore Sounds
    - [ ] Recipe Widget
  - **Information/Utility:**
    - [ ] News Widget (RSS/Reddit)
    - [ ] Weather Widget
  - **Gamification:**
    - [ ] Achievement Showcase
    - [ ] Brain Teaser/Puzzle Widget
    - [ ] _(More Mini-Games - TBD)_
    - [x] Quest Log Widget (Considered, but using dedicated Panel instead - Implemented v0.2.1)
    - [x] Active Quests Summary (`ActiveQuestsSummaryWidget.tsx`) - Shows count and list of active quests.
  - **Yuzu:** (Path for Yuzu features)
    - [ ] Unlock Casual Tone
    - [ ] Unlock Formal Tone
    - [ ] Unlock 'Gen Z' Tone
    - [ ] Increase Message Limit

## Monetization

- [ ] Subscription-based ($7/month).
- [ ] No ads or IAPs.
- [ ] **Subscriber Advantages:**
  - [ ] Unlimited Yuzu interaction (Overrides path limit?).
  - [ ] Early access to new features/widgets.
  - [ ] Exclusive customization options (Shop items?).
  - [ ] Increased reward multiplier.
  - [ ] Advanced data insights/analytics.
  - [ ] Priority support.

## User Experience (UX)

- [ ] Minimal user input focus.
- [x] Intuitive interface (Implemented Left sidebar, sliding panels for Toolbox, GM, Profile, Paths, Data Sources, Finance Settings). **Sidebar refactored for dynamic data source buttons.**
  - [x] Quests Panel (Implemented v0.2.1, UI refactored v0.2.3)
- [x] Dashboard customization implemented.
- [x] **Widget Adding:** Replaced drag-and-drop with click-to-add from toolbox.
- [x] **Panel Behavior:**
  - [x] Panels (except Toolbox) slide over the dashboard content.
  - [x] State and rendering for sliding panels moved into `LeftSidebar.tsx`.
  - [x] Panels use `max-width` for responsiveness.
  - [x] Background overlay added when panels are open.
- [x] **Edit Mode Interaction:**
  - [x] Exiting edit mode always returns to the default desktop view.
  - [x] Attempting to open a panel during edit mode shakes the edit indicator and shows a toast.
  - **[x] Invalid Widget Handling:** Error state with delete button shown for unknown widget types in edit mode.
  - **[x] Edit State Management:** Refactored to use separate local state (`editItems`) during edit mode. All changes (add, remove, move, resize, config) update this local state only.
  - **[x] Save on Exit:** Final `editItems` state is saved to the server in a single API call when exiting edit mode.
  - **[x] Resize/Move Bug Fix:** Corrected logic in `onLayoutChange` to preserve widget dimensions during move operations.
  - **[x] Save Loader:** Added loading overlay when saving changes upon exiting edit mode.
  - **[x] Centralized Widget Configuration:** Refactored config UI into a central modal (`WidgetConfigModal`) using specific config components (e.g., `HabitSelectionConfig`, `TextDisplayConfig`).
  - **[x] Prevent Grid Interaction During Config:** Disabled grid drag/resize while config modal is open.
  - **[x] Widget Config State & Persistence:** Refactored state management using `DashboardConfigContext` to handle immediate updates and ensure persistence.
- [ ] Emphasis on Positive Reinforcement (Guiding principle).
- **[x] PWA Update Notifications:** Implemented prompt for app updates & fixed update flow.
- **[x/✓] PWA Error Handling:** Implemented global Error Boundary (`ErrorBoundary.tsx`, `ErrorFallback.tsx`) to catch rendering errors and offer PWA update if available. **Fixed prop passing.**
- **[x] Toast Notifications:** Added system for user feedback (`useToast` context). **Signature updated.**
- **[x] Collapse on Drag:** Todo list items collapse during drag to improve DnD experience.
- **[x] Dashboard Loading:** Improved loading state to avoid full-screen flash (further improved by caching & background fetching).
- **[x] Dark Mode:** Forced dark mode via CSS, ignoring device preference.
- **[x] Development Aids:** Added widget coordinate display in dev mode.
- **[x] Pomodoro Banner:** Banner now pushes content down instead of overlaying.
- **[x] API Call Refactoring:** Centralized authenticated API calls into `src/lib/apiClient.ts` (`authenticatedFetch` function).
- **[x] 401 Error Handling:** Enhanced `authenticatedFetch` to proactively refresh session on 401 before retrying.
- **[x] Live Resizing:** Widgets now update appearance during resize drag, not just after.
- **[x] Timezone Consistency:** Fixed issue where daily resets (e.g., Daily Allowance, Habit checks) could occur at inconsistent times depending on user timezone vs. server time (UTC). Backend now uses user's timezone provided by the frontend.
- **[x] Auth Context Refactor:** Separated initial load effect from auth state change listener to prevent potential infinite loops (v0.2.2).
- **[x] Centralized Fetching:** Implemented `FetchManagerContext` to control data fetching frequency (cooldown on focus), provide manual refresh, and prevent redundant fetches on auth state changes.
- **[x] Backend API Error Handling:** Implemented standardized error handling using custom error classes (`AppError`, `ValidationError`, etc.) and a global middleware (`errorHandler.ts`) for consistent JSON error responses across Dashboard, Todos, Calendar, Health, Finance, **Habits, Quests, User, and Yuzu** routes (v0.3.1 Refactor). **(Note: Minor workaround applied to `user/updateSettings.ts` due to persistent TS error).**
- **[x] Reminder Push Notification System:** (v0.3.0 - Refactored to API-based)
  - [x] **Database:** Added `timezone` to `user_settings`. Created `push_subscriptions` table. Regenerated types (`api/`, `src/`).
  - [x] **Backend API:**
    - Removed incorrect completion trigger (`addHabitEntry.ts`).
    - Added `GET /api/user/settings` endpoint (`getUserSettings.ts`).
    - Updated `PUT /api/user/settings` endpoint (`updateSettings.ts`) to handle timezone.
    - Added push subscription management endpoints (`pushSubscriptions.ts`, registered in `user.ts`).
    - Fixed `addHabit.ts` and `updateHabit.ts` to correctly save `enable_notification`.
  - [x] **Backend Scheduled Task (API Server):**
    - Removed Supabase Edge Function (`send-reminders`).
    - Created `api/src/services/reminderService.ts` to handle reminder checks and push sending.
    - Uses `node-cron` in `api/src/server.ts` to run `reminderService` every 15 mins (UTC).
    - Service fetches habits, user timezones, calculates local time interval, compares, logs notifications, and sends pushes via `web-push`. Uses `supabaseAdmin` client.
  - [x] **Frontend Service Worker (`src/sw.ts`):**
    - Created custom `sw.ts` with `push` and `notificationclick` listeners.
    - Updated `vite.config.ts` to use `injectManifest`.
    - **Added:** Posts `REFETCH_DATA` message to clients on `push` event.
  - [x] **Frontend UI (Subscription & Timezone):**
    - Added subscribe/unsubscribe logic and buttons to `UserProfilePanel.tsx`.
    - Added display of detected/stored timezone in `UserProfilePanel.tsx`.
    - `AuthContext.tsx` now fetches settings, detects timezone via `Intl`, and updates `user_settings` via API if timezone is null.
  - [x] **Frontend UI (Habit Form):**
    - Relabeled `enable_notification` checkbox in `HabitFormModal.tsx`.
    - Replaced time input with a `Select` dropdown enforcing 15-minute intervals.
    - Fixed modal crash related to empty select item value.
  - [x] **Frontend - Push Refetch:** `FetchManagerContext.tsx` listens for `REFETCH_DATA` message from service worker and triggers forced data refresh.
  - [x] **Cleanup:** Removed unused `push_notification_queue` table and related backend files.

## LLM Prompting Considerations

- [x] Personalized Quest Generation (using user data - Implemented v0.2.2, basic context).
- [x] Quest Criteria Generation (Implemented v0.2.2).
- [ ] Motivational Tone (customizable via Paths, low-pressure).
- [x] Contextual Awareness (access to user data - **Improved for Todo breakdown**, basic implementation for Quests v0.2.2).
- [ ] Adaptability (adjust quest difficulty).
- [ ] Randomized Timing.
- [ ] Urgency/Scarcity (carefully implemented).
- [ ] Adherence to Yuzu Availability limits (upgradable via Paths/Subscription).
- **[x] Task Breakdown:** Implemented Gemini integration for breaking down todo items, including prompt refinement **and parent context**.
- **[x] Yuzu Chat Prompting:** Refined prompt to use conversation history and user context for more relevant responses and suggestions, avoiding generic praise.
