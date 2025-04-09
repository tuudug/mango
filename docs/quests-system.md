# Mango Quest System Overview (v0.2.3)

This document provides a high-level overview of the quest system in the Mango application, covering its core components, lifecycle, generation, and automation features.

## Core Concepts

- **Purpose:** To provide users with short-term goals (daily/weekly quests) that encourage engagement with various app features (habits, todos, health, finance) and reward completion with XP for the progression system.
- **Types:** Quests are categorized as 'daily' or 'weekly'.
- **Source:** Quests can be generated manually (initially for testing) or automatically via an LLM ('llm_generated').
- **Criteria:** Each quest has one or more criteria that define the specific actions required for completion (e.g., check a specific habit, reach a step goal, complete a number of todos).
- **Manual Claiming:** Users must explicitly click a "Claim Reward" button to receive XP for completed quests. Rewards are not granted automatically upon meeting criteria.

## Quest Lifecycle

A quest progresses through the following statuses:

1.  **`available`**: A quest generated (manually or by LLM) but not yet started by the user. Displayed in the "Available" pool in the Quests Panel.
2.  **`active`**: A quest the user has chosen to pursue by clicking "Activate". Subject to limits (e.g., 2 active daily, 4 active weekly). Progress tracking begins only after activation.
3.  **`claimable`**: An active quest where all associated criteria have been met (`is_met = true`). The backend automatically updates the status to 'claimable'. The UI shows a "Claim Reward" button.
4.  **`completed`**: A claimable quest after the user clicks "Claim Reward". XP is awarded via the `userProgressService`.
5.  **`cancelled`**: An active quest that the user chose to abandon before completion by clicking "Cancel".

## LLM Generation (v0.2.2)

- **Trigger:** Users can manually trigger generation/reset of daily or weekly quests via buttons in the `QuestsPanel`. The backend enforces timing rules (e.g., daily reset after midnight user time, weekly reset TODO).
- **Process:**
  - The `generateQuestsForUser` service (`api/src/services/questService.ts`) fetches user context (level, habits, etc. - TODO: expand context).
  - A prompt is constructed instructing the LLM (Gemini via `geminiService.ts`) to generate quests, criteria (including type and config), and XP rewards in a specific JSON format.
  - The LLM response is parsed and validated. Habit names mentioned in criteria config are mapped back to existing `habit_id`s.
  - Valid quests and criteria are stored in the database (`quests`, `quest_criteria` tables) with `status = 'available'` and `source = 'llm_generated'`.
  - Generation timestamps are updated in `user_quest_state`.

## Automation & Progress Tracking (v0.2.3)

- **Trigger:** User actions related to quest criteria types (checking habits, completing todos, health data updates, finance updates) trigger backend checks.
- **Service:** The `updateQuestProgress` service (`api/src/services/questService.ts`) is called by relevant API route handlers (`habits`, `todos`, `health`, `finance`).
- **Logic:**
  - Finds active, unmet criteria matching the action type for the user.
  - Performs an **activation date check**: Ensures the action occurred on or after the quest's `activated_at` date (using user's timezone) before processing progress for date-sensitive criteria (`steps_reach`, `finance_under_allowance`).
  - Calls modular **criteria handlers** (`api/src/services/quest-criteria-handlers/`) based on `criterion.type`.
  - Handlers determine if progress should be incremented or if the criterion is met directly (`isMetOverride`).
  - The service updates `quest_criteria.current_progress` and `quest_criteria.is_met` in the database.
  - If a criterion's `is_met` becomes true, the `checkAndSetQuestClaimable` helper is called.
- **Claimable Status:** `checkAndSetQuestClaimable` fetches all criteria for the parent quest. If all are met and the quest is 'active', it updates the quest `status` to 'claimable' in the database.

## Frontend Display (`QuestsPanel.tsx`)

- Displays active and available quests, separated by daily/weekly type.
- Shows quest description, XP reward.
- Lists criteria for active quests, showing progress (e.g., `(3/5)`) and completion status (checkmark/strikethrough).
- Provides buttons to "Activate", "Cancel", or "Claim Reward" based on quest status and active limits.
- Includes "Generate/Reset" buttons with logic based on `generationState`.
- Calculates and displays **expiry time** for active quests (Daily: 24h, Weekly: 7d from `activated_at`). Shows time remaining or an "Expired" badge.
- **Disables claiming** and shows only the "Cancel" button for quests determined to be expired by the frontend calculation.
- Uses `framer-motion` for entry animations on quest cards.
- Refreshes quest data automatically on window focus (with 5min cooldown) and immediately (with 1.5s delay) after relevant user actions (checking habits, completing todos) via context calls.

## Key Files

- **Backend:**
  - `api/src/services/questService.ts` (Core logic: generation orchestration, progress update, claimable check)
  - `api/src/services/questCriteriaRegistry.ts` (Maps criteria types to handlers)
  - `api/src/services/quest-criteria-handlers/` (Directory with individual handler logic)
  - `api/src/routes/quests/` (API endpoints: GET /, POST /:id/activate, POST /:id/cancel, POST /:id/claim, POST /generate)
  - API handlers calling `updateQuestProgress` (in `habits`, `todos`, `health`, `finance` routes)
- **Frontend:**
  - `src/contexts/QuestsContext.tsx` (State management, API calls)
  - `src/components/datasources/QuestsPanel.tsx` (UI rendering)
  - `src/contexts/HabitsContext.tsx`, `src/contexts/TodosContext.tsx` (Call `fetchQuests` after actions)
- **Database Tables:** `quests`, `quest_criteria`, `user_quest_state`, `user_progress`
