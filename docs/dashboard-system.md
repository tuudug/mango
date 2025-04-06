# Mango Dashboard System Documentation

This document provides a comprehensive overview of the customizable dashboard system within the Mango application. It covers the core components, layout management, data fetching, caching, editing capabilities, and backend interactions.

## Overview

The dashboard serves as the central hub for the user, displaying various widgets (like To-Do List, Calendar, Steps Tracker) in a customizable grid layout. Users can add, remove, move, and resize widgets to personalize their view. The system supports separate layouts for desktop ('default') and mobile views and persists these layouts (including widget configurations) to the backend. Recent optimizations focus on minimizing disruptive loading states by implementing background fetching and data comparison. Widget configuration state is managed centrally via `DashboardConfigContext` to ensure reliable updates and persistence.

## Core Components & Hooks

- **`src/components/Dashboard.tsx`:** The main container component. It orchestrates the overall dashboard functionality, including:
  - Integrating the `LeftSidebar` and `DashboardHeader`.
  - Managing edit mode state (`isToolboxOpen`, `editTargetDashboard`).
  - Handling adding widgets via button clicks in the `WidgetToolbox`.
  - Implementing the logic to find the first available grid position for new widgets.
  - Rendering the `DashboardGrid` component.
  - Displaying loading states (initial auth check, initial layout load, edit mode switching).
  - Coordinating fetches via the `useDashboardLayout` hook based on user actions (opening/closing toolbox, changing edit target).
- **`src/contexts/DashboardConfigContext.tsx`:** (Recent Addition) Manages the state for all widget configurations across the dashboard.
  - Provides `widgetConfigs`: A map (`Record<string, GridItem['config']>`) holding the configuration for each widget instance by its ID.
  - Provides `setWidgetConfig`: Function to update the configuration for a specific widget ID.
  - Provides `initializeConfigs`: Function to populate the context state when a layout is loaded.
  - Consumed by `useDashboardLayout` (to initialize/update) and individual widgets (to read their config).
- **`src/components/dashboard/hooks/useDashboardLayout.ts`:** A custom React hook responsible for dashboard layout state management, fetching, caching, and saving logic. It also interacts with `DashboardConfigContext`.
  - Manages the core layout state (`items: GridItem[]`) and edit state (`editItems: GridItem[] | null`).
  - Handles fetching layouts from the backend (`fetchLayout`), including initializing the `DashboardConfigContext` with fetched configurations.
  - Implements local storage caching for layouts (`getCachedLayout`, `setCachedLayout`, etc.).
  - Contains logic for background fetching and layout comparison (`deepCompareLayouts`).
  - Manages loading states (`isLoadingLayout`, `isBackgroundFetching`).
  - Provides `updateLayoutAndConfig`: Function called when a widget's config is saved. Updates both the layout state (`items` or `editItems`) and the widget's config in the `DashboardConfigContext`.
  - Provides `saveEditLayout`: Function to save the final `editItems` state (including latest configs fetched from the context) to the backend.
- **`src/components/dashboard/components/DashboardGrid.tsx`:** Renders the actual grid using `react-grid-layout`.
  - Receives the `items` array (representing the layout structure) and renders corresponding widgets (`DashboardGridItem`).
  - Handles layout change events (`onLayoutChange`, `onResizeStop`, `onLiveResize`) passed up from `react-grid-layout` for moving/resizing existing widgets.
  - Adapts grid properties (columns, width) based on whether it's rendering the default or mobile layout preview.
- **`src/components/WidgetToolbox.tsx`:** A sliding panel displaying available widgets. Each widget has a "+" button to add it to the dashboard when in edit mode.
- **`src/components/WidgetConfigModal.tsx`:** (Recent Addition) A central modal used for configuring widgets. It dynamically renders specific configuration UI based on the widget type (using `widgetConfigComponents` map from `src/lib/widgetConfig.ts`).
- **`src/components/widget-configs/`:** (Recent Addition) Directory containing specific UI components for configuring different widget types (e.g., `HabitSelectionConfig.tsx`, `TextDisplayConfig.tsx`).
- **`src/components/DashboardGridItem.tsx`:** Renders a single widget within the grid.
  - Receives the `item: GridItem` prop.
  - Dynamically renders the correct widget component based on `item.type` using `widgetComponentMap`.
  - Passes necessary props (`id`, `w`, `h`) to the widget component.
  - **Important:** While it passes `config={item.config}`, widgets should now primarily read their config state from `DashboardConfigContext`. This prop is mainly used to initialize the `WidgetConfigModal`.
  - Renders edit controls (pencil, delete) when in edit mode.
  - Handles opening the `WidgetConfigModal` and calls `updateLayoutAndConfig` via the `onSave` callback.
- **`src/components/dashboard/components/EditModeIndicator.tsx`:** A floating indicator displayed when in edit mode, allowing the user to toggle between previewing/editing the 'default' and 'mobile' layouts and to exit edit mode.
- **`src/components/dashboard/utils.ts`:** Contains helper functions for:
  - Interacting with `localStorage` for caching layouts and sync times.
  - Loading/saving user path state (related to gamification, not directly dashboard layout).
  - **`deepCompareLayouts`:** (Recent Addition) Compares two layout arrays to check for meaningful differences before updating the UI state.
- **`src/lib/widgetConfig.ts`:** Defines the available `WidgetType`s and their default dimensions (`defaultWidgetLayouts`).

## Layout Management

### Data Structure

The dashboard layout is represented as an array of `GridItem` objects:

```typescript
// Simplified from src/lib/dashboardConfig.ts and hook usage
interface GridItem {
  id: string; // Unique identifier for the grid item instance
  type: WidgetType; // Type of widget (e.g., 'TodoList', 'StepsTracker')
  x: number; // Grid column position
  y: number; // Grid row position
  w: number; // Width in grid units
  h: number; // Height in grid units
  minW?: number; // Minimum width constraint
  minH?: number; // Minimum height constraint
  config?: Record<string, any>; // Widget-specific configuration object
}
```

### State Management

- **Layout State:** The primary layout structure state (`items: GridItem[]`) and the state for the layout being edited (`editItems: GridItem[] | null`) are managed within the `useDashboardLayout` hook using `useState`.
- **Configuration State:** Widget-specific configurations are managed centrally within the `DashboardConfigContext` as a map (`widgetConfigs: Record<string, GridItem['config']>`). Widgets read their config from here; `useDashboardLayout` updates it.

### Persistence

- **Backend:** Layouts are saved per-user in the Supabase `user_dashboard_layouts` table via a backend API.
- **API Endpoints:**
  - `GET /api/dashboards/:name`: Fetches the layout (including `config` for each item) for the specified dashboard name ('default' or 'mobile'). Requires authentication. Returns `{ layout: GridItem[] }` or 404/default on error.
  - `PUT /api/dashboards/:name`: Upserts the layout for the specified dashboard name. Requires authentication and a JSON body `{ layout: CachedGridItemData[] }`. The backend handler (`upsertDashboardLayout.ts`) saves the entire `layout` array, including the `config` objects within each item, to the JSONB column.
- **Saving:**
  - Layout changes (move/resize/add/delete) update the `editItems` state directly within `useDashboardLayout`.
  - Configuration changes update both `editItems` state and the `widgetConfigs` state in `DashboardConfigContext` via `updateLayoutAndConfig`.
  - When exiting edit mode, `saveEditLayout` calls `saveLayoutToServerInternal`.
  - `saveLayoutToServerInternal` takes the `editItems` array, but **maps it** to pull the latest `config` for each item directly from the `widgetConfigs` context state before sending the final payload to the `PUT` endpoint. This ensures config persistence.

### Default Layouts

- If no layout is found for a user (e.g., new user or fetch error), a default layout is generated using `getDefaultLayout` (defined in `src/components/dashboard/constants.ts`).
- Default dimensions and constraints for specific widget types are defined in `defaultWidgetLayouts` in `src/lib/widgetConfig.ts`.

## Fetching and Caching

The `fetchLayout` function in `useDashboardLayout` handles retrieving dashboard data.

### Local Storage Caching

- **Layout Cache:** Successfully fetched layouts are stored in `localStorage` using keys like `dashboard-layout-default` and `dashboard-layout-mobile`. This uses `getCachedLayout` and `setCachedLayout` from `utils.ts`.
- **Sync Time Cache:** A timestamp of the last successful fetch/save is stored in `localStorage` (`dashboard-last-sync-time`) using `getCachedLastSyncTime` and `setCachedLastSyncTime`.
- **Staleness Check:** Before fetching, the hook checks if the last sync time is within the `CACHE_STALE_DURATION` (currently 12 hours, defined in `constants.ts`).

### Fetching Logic (Optimized - Recent Changes)

1.  **Initial Load:**
    - `Dashboard.tsx` determines the initial view ('default' or 'mobile').
    - Calls `fetchLayout(initialName, false, { background: false })`.
    - `fetchLayout` checks the cache:
      - If **valid cache**: Displays cached layout immediately, sets `isLoadingLayout = false`, fetches updates in background.
      - If **stale/missing cache**: Proceeds with normal fetch, `isLoadingLayout = true`.
2.  **Background Fetches (Focus, etc.):**
    - Calls `fetchLayout` with `{ background: true }`.
    - Fetches data from API.
3.  **Data Processing & Comparison:**
    - After any fetch completes:
      - Extracts `config` from each fetched item and calls `initializeConfigs` on `DashboardConfigContext` to populate the central config state.
      - **If background fetch:** Compares fetched layout (`loadedItems`) with current display state (`itemsRef.current`) using `deepCompareLayouts`. Updates `items` state (and cache) only if different. Updates sync time cache.
      - **If non-background fetch:** Always updates `items` state and cache.
4.  **Fetching for Edit Mode:**
    - When entering edit mode or switching targets, calls `fetchLayout` with `{ forEditing: true }`.
    - This populates both `items` and `editItems` state, initializes the `DashboardConfigContext`, and updates the cache.

### Cache Invalidation

- Cache is considered stale if `LAST_SYNC_TIME_KEY` is older than `CACHE_STALE_DURATION`.
- Fetches can be forced (ignoring cache validity) by passing `forceFetch = true` to `fetchLayout`. This is used when entering edit mode or switching edit targets to ensure the latest version is being edited.

## Edit Mode

Edit mode is activated by opening the `WidgetToolbox` (`isToolboxOpen = true`).

- **Toggling:** Managed by the `toggleToolbox` function in `Dashboard.tsx`.
- **Desktop vs. Mobile Target:**
  - The `editTargetDashboard` state ('default' or 'mobile') determines which layout is being modified and previewed.
  - The `EditModeIndicator` allows toggling this target via `toggleEditTarget`.
  - Switching the target triggers a non-background fetch for the newly selected target layout.
  - **Recent Change:** A specific loading state (`isSwitchingEditMode`) and overlay are now used _only_ when switching between 'default' and 'mobile' edit targets, managed within `Dashboard.tsx`.
- **Adding Widgets:** Clicking the "+" button next to a widget in the `WidgetToolbox` triggers the `handleAddWidget` function in `Dashboard.tsx`. This function calculates the first available grid position (top-to-bottom, left-to-right) based on the widget's minimum dimensions (`minW`, `minH`) and existing items. It then adds the new `GridItem` to the `items` state and triggers `saveLayoutToServer`.
- **Moving/Resizing:** Handled by `react-grid-layout` callbacks (`onLayoutChange`, `onLiveResize`, `handleResizeStop`) passed up to `Dashboard.tsx`. These directly update the `editItems` state via `setEditItems`. No server save is triggered immediately.
- **Deleting:** Clicking delete button calls `handleDeleteWidget` in `Dashboard.tsx`, which filters the `editItems` state via `setEditItems`. No server save is triggered immediately.
- **Configuring:**
  - Clicking the pencil icon opens `WidgetConfigModal`.
  - Changes within the modal update the modal's internal `tempConfig` state.
  - Clicking "Save Changes" calls `handleSaveConfig` in `DashboardGridItem`.
  - `handleSaveConfig` calls `updateLayoutAndConfig` in `useDashboardLayout`.
  - `updateLayoutAndConfig` updates both the `editItems` state (setting the new `config` object on the specific item) and the `widgetConfigs` state in the context. Immediate UI updates in widgets are driven by the context change.
- **Saving on Exit:** When the toolbox is closed (`toggleToolbox` in `Dashboard.tsx`), `saveEditLayout` is called. This function reads the current `editItems` state, passes it to `saveLayoutToServerInternal`, which then constructs the final payload (pulling latest configs from the context) and sends the `PUT` request to the backend.

## Drag and Drop (DnD) - Removed for Toolbox

- Drag and Drop functionality using `@dnd-kit/core` was previously used for adding widgets from the toolbox but has been **removed** in favor of the click-to-add mechanism described above.
- DnD might still be used internally by `react-grid-layout` for moving/resizing widgets _within_ the grid itself.

## Key Files Summary

- `src/components/Dashboard.tsx`
- `src/components/dashboard/hooks/useDashboardLayout.ts`
- `src/components/dashboard/utils.ts`
- `src/components/dashboard/components/DashboardGrid.tsx`
- `src/components/dashboard/constants.ts`
- `src/components/dashboard/types.ts`
- `src/components/WidgetToolbox.tsx`
- `src/components/WidgetConfigModal.tsx`
- `src/components/widget-configs/` (Directory)
- `src/components/dashboard/components/EditModeIndicator.tsx`
- `src/lib/widgetConfig.ts`
- `src/contexts/DashboardConfigContext.tsx`
- `api/src/routes/dashboards/getDashboardLayout.ts`
- `api/src/routes/dashboards/upsertDashboardLayout.ts`
