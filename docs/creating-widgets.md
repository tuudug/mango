# Guide: Creating a New Dashboard Widget

This guide outlines the steps required to add a new custom widget to the Mango Dashboard.

## 1. Create the Widget Component

- Create a new `.tsx` file for your widget component within the `src/widgets/` directory (e.g., `src/widgets/MyNewWidget.tsx`).
- The component should be a standard React functional component.
- It will receive `id` (string), `w` (current width in grid units), and `h` (current height in grid units) props. These are defined in the `WidgetProps` interface in `src/components/DashboardGridItem.tsx`.
- Implement the desired functionality and UI for your widget. You can use the `w` and `h` props to conditionally render different views based on the widget's size.

**Example (`src/widgets/MyNewWidget.tsx`):**

```tsx
import React from "react";

// Define the props your widget expects (must include id, w, h)
interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

// Prefix unused props with underscore if needed
export function MyNewWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const isMini = _w < 4; // Example threshold for a "mini" view

  if (isMini) {
    return (
      <div className="p-2 h-full flex items-center justify-center">
        <h3 className="text-sm font-medium">Mini View (w: {_w})</h3>
        {/* Render a compact version of the widget */}
      </div>
    );
  }

  // Render the full version
  return (
    <div className="p-4 h-full flex flex-col items-center justify-center">
      <h2 className="text-lg font-semibold">My New Widget (ID: {_id})</h2>
      <p className="text-xs text-gray-500">
        Size: {_w}x{_h}
      </p>
      {/* Add your full widget UI and functionality here */}
    </div>
  );
}
```

### Handling Widget Configuration (Important!)

Previously, widgets might have received their configuration directly via the `config` prop passed down through `DashboardGridItem`. However, due to potential state propagation issues with the grid library, this approach is **deprecated** for accessing config data within the widget's logic.

Instead, configurable widgets **must** use the `DashboardConfigContext` to retrieve their configuration state.

1.  **Import the Hook:** Import `useDashboardConfig` from `@/contexts/DashboardConfigContext`.
2.  **Consume Context:** Call `const { widgetConfigs } = useDashboardConfig();` inside your widget component.
3.  **Get Specific Config:** Access the configuration for the current widget instance using its `id` prop: `const currentWidgetConfig = widgetConfigs[id];`.
4.  **Use Config Data:** Use the data from `currentWidgetConfig` (e.g., `currentWidgetConfig?.yourSetting`) in your widget's rendering logic and `useEffect` hooks.
5.  **Dependencies:** Ensure your `useEffect` hooks that depend on configuration data list `currentWidgetConfig` or specific fields within it (like `currentWidgetConfig?.yourSetting`) in their dependency array.

**Example Snippet (inside your widget component):**

```tsx
import { useDashboardConfig } from "@/contexts/DashboardConfigContext";

// ... (WidgetProps definition remains the same, including optional config for modal init)

export function MyConfigurableWidget({ id, w, h }: WidgetProps) {
  const { widgetConfigs } = useDashboardConfig();
  const currentWidgetConfig = widgetConfigs[id];
  const settingValue = currentWidgetConfig?.yourSetting || "Default Value";

  useEffect(() => {
    // Logic that depends on the setting value
    console.log("Setting value changed:", settingValue);
  }, [settingValue]); // Depend on the specific value or the whole config object

  return (
    <div>
      Widget {id} - Setting: {settingValue}
    </div>
  );
}
```

**Note:** The `config` prop is still passed down by `DashboardGridItem` and is necessary for initializing the `WidgetConfigModal`. However, the widget component itself should rely on the context for reading the config state used in its logic and rendering.

## 2. Configure Widget Properties

- Open the **widget configuration file**: `src/lib/widgetConfig.ts`.
- **Define Widget Type:** Add your new widget's display name to the `WidgetType` union type. **Convention:** Use concise names (e.g., "Pomodoro", "Ambience") rather than "Pomodoro Widget".
  ```typescript
  export type WidgetType =
    | "Steps Tracker"
    | // ... other types
    | "My New Widget"; // <-- Add your type name here
  ```
- **Define Default Layout:** Add an entry for your widget in the `defaultWidgetLayouts` object, specifying its default width (`w`), height (`h`), and optional minimum dimensions (`minW`, `minH`) in grid units. Use the same `WidgetType` string as the key.
  ```typescript
  export const defaultWidgetLayouts: Record<
    WidgetType,
    { w: number; h: number; minW?: number; minH?: number }
  > = {
    // ... other layouts
    "My New Widget": { w: 6, h: 4, minW: 2, minH: 2 }, // <-- Add layout defaults
  };
  ```
- **Define Metadata (Icon, Color, Group):** Add an entry for your widget in the `widgetMetadata` object. Use the same `WidgetType` string as the key.

  - Choose an appropriate icon from `lucide-react` and import it at the top of `widgetConfig.ts`.
  - Define the `colorAccentClass` using Tailwind CSS classes for the left border color (e.g., `border-l-cyan-400`).
  - Assign the widget to a `WidgetGroup` (e.g., `"Productivity"`, `"Tracking"`). Define new groups in the `WidgetGroup` type if needed.

  ```typescript
  import {
    // ... other icons
    Sparkles, // <-- Import your chosen icon
  } from "lucide-react";

  export const widgetMetadata: Record<
    WidgetType,
    { icon: LucideIcon; colorAccentClass: string; group: WidgetGroup }
  > = {
    // ... other metadata
    "My New Widget": {
      icon: Sparkles, // <-- Use imported icon
      colorAccentClass: "border-l-cyan-400", // <-- Define accent color
      group: "Other", // <-- Assign to a group
    },
  };
  ```

## 3. Register the Widget Component

- Open the grid item component file: `src/components/DashboardGridItem.tsx`.
- **Import Component:** Import your newly created widget component at the top.
  ```typescript
  // Widget component imports
  // ... other imports
  import { MyNewWidget } from "../widgets/MyNewWidget"; // <-- Import your component
  ```
- **Add to Map:** Add an entry to the `widgetComponentMap` object, mapping the `WidgetType` string (defined in step 2) to the imported component.
  ```typescript
  // The WidgetProps interface now includes id, w, h
  const widgetComponentMap: Record<
    WidgetType,
    React.ComponentType<WidgetProps>
  > = {
    // ... other mappings
    "My New Widget": MyNewWidget, // <-- Add your mapping here
  };
  ```
- The `DashboardGridItem` component automatically passes the `id`, `w`, `h`, and `config` props to your widget component. (Widgets should use the context to read config state, see section above).

## 4. Add to Toolbox

- To make the widget available for users to add from the toolbox in edit mode:
  - Open `src/lib/widgetConfig.ts`.
  - Add the `WidgetType` string to the `availableWidgets` array.
  ```typescript
  export const availableWidgets: WidgetType[] = [
    // ... other available widgets
    "My New Widget", // <-- Add here to make it available in toolbox
  ];
  ```
- **Important:** Ensure the `WidgetGroup` you assigned in Step 2 (`widgetMetadata`) is included in the `groupOrder` array within `src/components/WidgetToolbox.tsx`. If the group is missing from `groupOrder`, the widget will not appear in the toolbox even if added to `availableWidgets`.

  ```typescript
  // Example from src/components/WidgetToolbox.tsx
  const groupOrder: WidgetGroup[] = [
    "Finance",
    "Tracking",
    "Productivity",
    "Mindfulness/Focus", // <-- Make sure your widget's group is listed here
    "Calendar",
    "Other",
  ];
  ```

## 5. Implement Dynamic Rendering (Optional)

As shown in the Step 1 example, you can use the `w` and `h` props passed to your widget component to render different content or layouts based on the available space.

- Define thresholds based on grid units (e.g., `const isTooSmall = w < 3 || h < 2;`).
- Use conditional rendering (`if/else` or ternary operators) to switch between different JSX structures or apply different styles.
- This allows widgets to provide a compact summary view when small and a more detailed view when larger.

**Example Snippet (inside your widget component):**

```tsx
export function MySizableWidget({ id, w, h }: WidgetProps) {
  if (w < 4) {
    // Render compact view
    return <div className="p-1">Compact (w:{w})</div>;
  }

  // Render full view
  return (
    <div className="p-4">
      Full View (w:{w}, h:{h}){/* ... full widget content ... */}
    </div>
  );
}
```

## Conclusion

After completing these steps, your new widget should be integrated into the dashboard system. You should be able to:

- See it rendered if added to the initial `items` state in `Dashboard.tsx` (for testing).
- Add it from the toolbox (if step 4 was completed correctly) when the dashboard is in edit mode.
- See its specific icon and accent color applied.
- Interact with its unique UI and functionality.
- Optionally, see the widget adapt its display based on its size if you implemented dynamic rendering (Step 5).
- See the widget update correctly when its configuration is changed via the central modal.
