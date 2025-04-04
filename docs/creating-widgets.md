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
interface MyNewWidgetProps {
  id: string;
  w: number;
  h: number;
}

export function MyNewWidget({ id, w, h }: MyNewWidgetProps) {
  const isMini = w < 4; // Example threshold for a "mini" view

  if (isMini) {
    return (
      <div className="p-2 h-full flex items-center justify-center">
        <h3 className="text-sm font-medium">Mini View (w: {w})</h3>
        {/* Render a compact version of the widget */}
      </div>
    );
  }

  // Render the full version
  return (
    <div className="p-4 h-full flex flex-col items-center justify-center">
      <h2 className="text-lg font-semibold">My New Widget (ID: {id})</h2>
      <p className="text-xs text-gray-500">
        Size: {w}x{h}
      </p>
      {/* Add your full widget UI and functionality here */}
    </div>
  );
}
```

## 2. Configure Widget Properties

- Open the **widget configuration file**: `src/lib/widgetConfig.ts`.
- **Define Widget Type:** Add your new widget's display name to the `WidgetType` union type.
  ```typescript
  export type WidgetType =
    | "Steps Tracker"
    | // ... other types
    | "My New Widget"; // <-- Add your type name here
  ```
- **Define Default Layout:** Add an entry for your widget in the `defaultWidgetLayouts` object, specifying its default width (`w`), height (`h`), and optional minimum dimensions (`minW`, `minH`) in grid units.
  ```typescript
  export const defaultWidgetLayouts: Record<
    WidgetType,
    { w: number; h: number; minW?: number; minH?: number }
  > = {
    // ... other layouts
    "My New Widget": { w: 6, h: 4, minW: 2, minH: 2 }, // <-- Add layout defaults
  };
  ```
- **Define Metadata (Icon, Color, Group):** Add an entry for your widget in the `widgetMetadata` object.

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
- The `DashboardGridItem` component automatically passes the `id`, `w`, and `h` props to your widget component.

## 4. Add to Toolbox (Optional)

- If you want the widget to be available for users to add from the toolbox in edit mode:
  - Open `src/lib/widgetConfig.ts`.
  - Add the `WidgetType` string to the `availableWidgets` array.
  ```typescript
  export const availableWidgets: WidgetType[] = [
    // ... other available widgets
    "My New Widget", // <-- Add here to make it available in toolbox
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
- Add it from the toolbox (if step 4 was completed) when the dashboard is in edit mode.
- See its specific icon and accent color applied.
- Interact with its unique UI and functionality.
- Optionally, see the widget adapt its display based on its size if you implemented dynamic rendering (Step 5).
