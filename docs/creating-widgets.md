# Guide: Creating a New Dashboard Widget

This guide outlines the steps required to add a new custom widget to the Mango Dashboard.

## 1. Create the Widget Component

- Create a new `.tsx` file for your widget component within the `src/widgets/` directory (e.g., `src/widgets/MyNewWidget.tsx`).
- The component should be a standard React functional component.
- It will receive an `id` prop (and potentially others in the future) defined in the `WidgetProps` interface in `src/components/DashboardGridItem.tsx`.
- Implement the desired functionality and UI for your widget within this component.

**Example (`src/widgets/MyNewWidget.tsx`):**

```tsx
import React from "react";

interface MyNewWidgetProps {
  id: string; // All widgets receive an ID
}

export function MyNewWidget({ id }: MyNewWidgetProps) {
  // Replace with your widget's content and logic
  return (
    <div className="p-4 h-full flex items-center justify-center">
      <h2 className="text-lg font-semibold">My New Widget (ID: {id})</h2>
      {/* Add your widget UI and functionality here */}
    </div>
  );
}
```

## 2. Configure Widget Properties

- Open the dashboard configuration file: `src/lib/dashboardConfig.ts`.
- **Define Widget Type:** Add your new widget's display name to the `WidgetType` union type.
  ```typescript
  export type WidgetType =
    | "Trackable Graph"
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
    "My New Widget": { w: 3, h: 2, minW: 2, minH: 2 }, // <-- Add layout defaults
  };
  ```
- **Define Metadata (Icon & Color):** Add an entry for your widget in the `widgetMetadata` object.

  - Choose an appropriate icon from `lucide-react` and import it at the top of the file.
  - Define the `colorAccentClass` using Tailwind CSS classes for the left border color (e.g., `border-l-cyan-500 dark:border-l-cyan-400`).

  ```typescript
  import {
    // ... other icons
    Sparkles, // <-- Import your chosen icon
  } from "lucide-react";

  export const widgetMetadata: Record<
    WidgetType,
    { icon: LucideIcon; colorAccentClass: string }
  > = {
    // ... other metadata
    "My New Widget": {
      icon: Sparkles, // <-- Use imported icon
      colorAccentClass: "border-l-cyan-500 dark:border-l-cyan-400", // <-- Define accent color
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
  const widgetComponentMap: Record<
    WidgetType,
    React.ComponentType<WidgetProps>
  > = {
    // ... other mappings
    "My New Widget": MyNewWidget, // <-- Add your mapping here
  };
  ```

## 4. (Optional) Add to Toolbox

- If you want the widget to be available for users to add from the toolbox in edit mode:
  - Open `src/lib/dashboardConfig.ts`.
  - Add the `WidgetType` string to the `availableWidgets` array.
  ```typescript
  export const availableWidgets: WidgetType[] = [
    // ... other available widgets
    "My New Widget", // <-- Add here to make it available in toolbox
  ];
  ```

## Conclusion

After completing these steps, your new widget should be integrated into the dashboard system. You should be able to:

- See it rendered if added to the initial `items` state in `Dashboard.tsx` (for testing).
- Add it from the toolbox (if step 4 was completed) when the dashboard is in edit mode.
- See its specific icon and accent color applied.
- Interact with its unique UI and functionality.
