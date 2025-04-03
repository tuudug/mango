# Mango Dashboard System Documentation

This document provides a comprehensive overview of the customizable dashboard system within the Mango application. It covers the core components, layout management, data fetching, caching, editing capabilities, and backend interactions.

## Overview

The dashboard serves as the central hub for the user, displaying various widgets (like To-Do List, Calendar, Steps Tracker) in a customizable grid layout. Users can add, remove, move, and resize widgets to personalize their view. The system supports separate layouts for desktop ('default') and mobile views and persists these layouts to the backend. Recent optimizations focus on minimizing disruptive loading states by implementing background fetching and data comparison.

## Core Components & Hooks

- **`src/components/Dashboard.tsx`:** The main container component. It orchestrates the overall dashboard functionality, including:
  - Integrating the `LeftSidebar` and `DashboardHeader`.
  - Managing edit mode state (`isToolboxOpen`, `editTargetDashboard`).
  - Handling Drag and Drop (DnD) operations using `@dnd-kit/core` for adding widgets from the toolbox.
  - Rendering the `DashboardGrid` component.
  - Displaying loading states (initial auth check, initial layout load, edit mode switching).
  - Coordinating fetches via the `useDashboardLayout` hook based on user actions (opening/closing toolbox, changing edit target).
- **`src/components/dashboard/hooks/useDashboardLayout.ts`:** A custom React hook responsible for all dashboard layout state management, fetching, caching, and saving logic.
  - Manages the core layout state (`items: GridItem[]`).
  - Handles fetching layouts from the backend (`fetchLayout`).
  - Implements local storage caching (`getCachedLayout`, `setCachedLayout`, `getCachedLastSyncTime`, `setCachedLastSyncTime`).
  - Contains logic for background fetching and layout comparison (`deepCompareLayouts`).
  - Manages loading states (`isLoadingLayout`, `isBackgroundFetching`).
  - Provides a debounced function to save layout changes to the backend (`saveLayoutToServer`).
- **`src/components/dashboard/components/DashboardGrid.tsx`:** Renders the actual grid using `react-grid-layout`.
  - Receives the `items` array and renders corresponding widgets (`DashboardGridItem`).
  - Handles layout change events (`onLayoutChange`, `onResizeStop`) passed up from `react-grid-layout`.
  - Adapts grid properties (columns, width) based on whether it's rendering the default or mobile layout preview.
- **`src/components/WidgetToolbox.tsx`:** A sliding panel displaying available widgets that can be dragged onto the dashboard grid when in edit mode.
- **`src/components/dashboard/components/EditModeIndicator.tsx`:** A floating indicator displayed when in edit mode, allowing the user to toggle between previewing/editing the 'default' and 'mobile' layouts and to exit edit mode.
- **`src/components/dashboard/utils.ts`:** Contains helper functions for:
  - Interacting with `localStorage` for caching layouts and sync times.
  - Loading/saving user path state (related to gamification, not directly dashboard layout).
  - **`deepCompareLayouts`:** (Recent Addition) Compares two layout arrays to check for meaningful differences before updating the UI state.
- **`src/lib/dashboardConfig.ts`:** Defines the available `WidgetType`s and their default dimensions (`defaultWidgetLayouts`).

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
  // Potentially other widget-specific props if needed later
}
```

### State Management

The primary layout state (`items: GridItem[]`) is managed within the `useDashboardLayout` hook using `useState`. This state represents the currently displayed dashboard layout.

### Persistence

- **Backend:** Layouts are saved per-user in the Supabase `user_dashboard_layouts` table via a backend API.
- **API Endpoints:**
  - `GET /api/dashboards/:name`: Fetches the layout for the specified dashboard name ('default' or 'mobile'). Requires authentication (Bearer token). Returns `{ layout: GridItem[] }` or 404/default on error.
  - `PUT /api/dashboards/:name`: Upserts (updates or creates) the layout for the specified dashboard name. Requires authentication and a JSON body `{ layout: CachedGridItemData[] }` (where `CachedGridItemData` is `GridItem` without `minW`/`minH`).
- **Saving:** Changes made in edit mode trigger the `saveLayoutToServer` function (debounced by 1 second) in `useDashboardLayout` to call the `PUT` endpoint.

### Default Layouts

- If no layout is found for a user (e.g., new user or fetch error), a default layout is generated using `getDefaultLayout` (defined in `src/components/dashboard/constants.ts`).
- Default dimensions and constraints for specific widget types are defined in `defaultWidgetLayouts` in `src/lib/dashboardConfig.ts`.

## Fetching and Caching

The `fetchLayout` function in `useDashboardLayout` handles retrieving dashboard data.

### Local Storage Caching

- **Layout Cache:** Successfully fetched layouts are stored in `localStorage` using keys like `dashboard-layout-default` and `dashboard-layout-mobile`. This uses `getCachedLayout` and `setCachedLayout` from `utils.ts`.
- **Sync Time Cache:** A timestamp of the last successful fetch/save is stored in `localStorage` (`dashboard-last-sync-time`) using `getCachedLastSyncTime` and `setCachedLastSyncTime`.
- **Staleness Check:** Before fetching, the hook checks if the last sync time is within the `CACHE_STALE_DURATION` (currently 12 hours, defined in `constants.ts`).

### Fetching Logic (Optimized - Recent Changes)

1.  **Initial Load:**
    - `Dashboard.tsx` determines the initial view ('default' or 'mobile') based on screen width.
    - It calls `fetchLayout(initialName, false, { background: false })`.
    - `fetchLayout` checks the cache:
      - If a **valid cache** exists:
        - It immediately calls `setItems(cachedLayout)` to display the cached version quickly.
        - It sets `isLoadingLayout = false`.
        - It **forces the ongoing fetch to proceed in the background** (`isBackground = true`).
      - If the cache is **stale or missing**:
        - It proceeds with a normal, non-background fetch (`isLoadingLayout = true`).
2.  **Background Fetches (Triggered by focus, explicit close, etc.):**
    - Calls are made with `{ background: true }`.
    - `fetchLayout` sets `isBackgroundFetching = true`.
    - It fetches data from the API.
3.  **Data Comparison (Background Fetches & Initial Load with Cache):**
    - After a fetch completes (either background or the background part of initial load):
    - The fetched `loadedItems` are compared against the _current_ `items` state using `deepCompareLayouts`.
    - **If different:** `setItems(loadedItems)` is called, updating the UI. The cache and sync time are updated.
    - **If identical:** `setItems` is **not** called, preventing unnecessary re-renders. Only the sync time is updated in the cache.
4.  **Non-Background Fetches (Edit Mode Switch, Initial Load without Cache):**
    - Calls are made with `{ background: false }`.
    - `fetchLayout` sets `isLoadingLayout = true`.
    - After fetching, it _always_ calls `setItems(loadedItems)` and updates the cache/sync time.
    - `isLoadingLayout` is set to `false` in the `finally` block.

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
- **Adding Widgets:** Dragging a widget type from `WidgetToolbox` onto the `DashboardGrid` triggers `handleDragEnd` in `Dashboard.tsx`, which adds a new `GridItem` to the `items` state and triggers `saveLayoutToServer`.
- **Moving/Resizing:** Handled by `react-grid-layout` callbacks (`onLayoutChange`, `handleResize`) within `DashboardGrid.tsx`, which are passed up to `Dashboard.tsx`. These update the `items` state and trigger `saveLayoutToServer`.
- **Deleting:** Clicking a delete button on a widget (rendered by `DashboardGridItem`) calls `handleDeleteWidget` in `Dashboard.tsx`, filtering the `items` state and triggering `saveLayoutToServer`.
- **Saving:** All modifications in edit mode trigger `saveLayoutToServer`, which debounces the actual `PUT` request to the backend API.

## Drag and Drop (DnD)

- Implemented using `@dnd-kit/core`.
- `DndContext` wraps the main `Dashboard` component.
- `WidgetToolbox` items are draggable sources.
- `DashboardGrid` (via the `<main>` element wrapped in `<Droppable>`) is the droppable target.
- `handleDragStart` and `handleDragEnd` in `Dashboard.tsx` manage the DnD lifecycle for adding new widgets.
- `DragOverlay` shows a `WidgetPreview` during drag operations.

## Key Files Summary

- `src/components/Dashboard.tsx`
- `src/components/dashboard/hooks/useDashboardLayout.ts`
- `src/components/dashboard/utils.ts`
- `src/components/dashboard/components/DashboardGrid.tsx`
- `src/components/dashboard/constants.ts`
- `src/components/dashboard/types.ts`
- `src/components/WidgetToolbox.tsx`
- `src/components/dashboard/components/EditModeIndicator.tsx`
- `src/lib/dashboardConfig.ts`
- `api/src/routes/dashboards/getDashboardLayout.ts`
- `api/src/routes/dashboards/upsertDashboardLayout.ts`
