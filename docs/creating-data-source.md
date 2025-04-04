# Guide: Creating a New Data Source Panel

This guide outlines the steps required to add a new data source panel, accessible via a button in the `LeftSidebar`.

## What are Data Sources?

In the context of this application, **Data Sources** represent distinct categories of user data, such as calendar events, health metrics (steps), to-do items, or financial entries. Each data source is typically managed by its own React Context (`src/contexts/`). This context handles fetching data (from manual inputs or external services like Google), storing it, and providing functions for interaction (adding, deleting, updating).

Various widgets and features throughout the application can then tap into these contexts to display relevant information or allow users to manage their data. The panels accessible from the `LeftSidebar` provide a dedicated interface for viewing the status of these data sources, managing connections (if applicable), and sometimes performing basic data entry or viewing.

---

## 1. Create the Data Source Context

- Create a new React Context to manage the state and logic for your data source. Place this in the `src/contexts/` directory (e.g., `src/contexts/MyDataSourceContext.tsx`).
- This context should handle:
  - Fetching data from the relevant backend API.
  - Storing the data (e.g., using `useState`).
  - Providing functions to interact with the data (e.g., add, update, delete).
  - Managing loading and error states.
  - Handling connection/disconnection logic if it connects to an external service (like Google).
- Export the provider component and a custom hook (e.g., `useMyDataSource`) for easy consumption.

**Example (`src/contexts/MyDataSourceContext.tsx`):**

```tsx
import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useCallback,
} from "react";
import { useAuth } from "./AuthContext"; // Assuming auth is needed

// Define data structure
interface MyData {
  id: string;
  value: string;
}

// Define context type
interface MyDataSourceContextType {
  myData: MyData[];
  isLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  // Add other actions as needed
}

const MyDataSourceContext = createContext<MyDataSourceContextType | undefined>(
  undefined
);

export const MyDataSourceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [myData, setMyData] = useState<MyData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth(); // Get session if API calls need auth

  const fetchData = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      // Replace with your actual API call
      const response = await fetch("/api/my-data-source", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch data");
      const data = await response.json();
      setMyData(data.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setMyData([]);
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  // Add other functions (add, delete, etc.) here

  const value = { myData, isLoading, error, fetchData };

  return (
    <MyDataSourceContext.Provider value={value}>
      {children}
    </MyDataSourceContext.Provider>
  );
};

export const useMyDataSource = (): MyDataSourceContextType => {
  const context = useContext(MyDataSourceContext);
  if (!context) {
    throw new Error(
      "useMyDataSource must be used within a MyDataSourceProvider"
    );
  }
  return context;
};
```

## 2. Create the Panel Component

- Create a new `.tsx` file for your panel component within `src/components/datasources/` or a relevant subdirectory (e.g., `src/components/datasources/MyDataSourcePanel.tsx`).
- This component will display the data fetched by the context and provide UI elements for interaction (forms, buttons, lists).
- It **must** accept an optional `onClose?: () => void;` prop.
- Include a header section with the data source title, an icon, and a close button (`X`) that calls the `onClose` prop when clicked. Use Shadcn UI's `Card`, `CardHeader`, `CardTitle`, `CardContent` for consistency.
- Use the custom hook created in Step 1 (e.g., `useMyDataSource()`) to access the data, loading state, error state, and action functions.

**Example (`src/components/datasources/MyDataSourcePanel.tsx`):**

```tsx
import React from "react";
import { useMyDataSource } from "@/contexts/MyDataSourceContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, DatabaseZap } from "lucide-react"; // Choose an icon

interface MyDataSourcePanelProps {
  onClose?: () => void;
}

export function MyDataSourcePanel({ onClose }: MyDataSourcePanelProps) {
  const { myData, isLoading, error, fetchData } = useMyDataSource();

  return (
    <Card className="h-full flex flex-col shadow-lg border-l bg-gray-800 rounded-none">
      <CardHeader className="flex flex-row items-center justify-between p-4 border-b flex-shrink-0 border-gray-700">
        <div className="flex items-center gap-2">
          <DatabaseZap className="w-5 h-5 text-purple-400" /> {/* Icon */}
          <CardTitle className="text-lg font-semibold">
            My Data Source
          </CardTitle>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7"
          >
            <X size={16} />
            <span className="sr-only">Close Panel</span>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-4 overflow-y-auto">
        <ScrollArea className="h-full pr-3">
          {/* Add connection status, forms, data display etc. here */}
          {isLoading && <p>Loading...</p>}
          {error && <p className="text-red-400">Error: {error}</p>}
          <ul>
            {myData.map((item) => (
              <li key={item.id}>{item.value}</li>
            ))}
          </ul>
          <Button onClick={fetchData} disabled={isLoading}>
            Refresh
          </Button>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
```

## 3. Configure Data Source Button

- Open the data source configuration file: `src/lib/dataSourceConfig.ts`.
- **Define Data Source ID:** Add a unique ID string for your data source to the `DataSourceId` union type. This ID will be used as a key in the `LeftSidebar`'s state.
  ```typescript
  export type DataSourceId =
    | "finance"
    | "calendar"
    | "health"
    | "todos"
    | "myData"; // <-- Add your ID here
  ```
- **Add Configuration Entry:** Add a new object to the `dataSourceConfig` array.

  - Choose an appropriate icon from `lucide-react` and import it at the top of `dataSourceConfig.ts`.
  - Set the `id` to the string defined above.
  - Set the `label` (used for the tooltip).
  - Set the `IconComponent`.

  ```typescript
  import {
    // ... other icons
    DatabaseZap, // <-- Import your chosen icon
  } from "lucide-react";

  export const dataSourceConfig: DataSourceConfigItem[] = [
    // ... other configs
    {
      id: "myData", // <-- Use the ID defined above
      label: "My Data Source Panel", // <-- Tooltip text
      IconComponent: DatabaseZap, // <-- Use imported icon
    },
  ];
  ```

## 4. Integrate into `LeftSidebar.tsx`

- Open `src/components/LeftSidebar.tsx`.
- **Import Panel Component:** Import your new panel component (e.g., `MyDataSourcePanel`).
- **Update `PanelId` Type:** Add your new data source ID string literal to the `PanelId` union type.
  ```typescript
  type PanelId =
    | DataSourceId
    | "gameMaster"
    | "userProfile"
    | "paths"
    | "myData"; // <-- Add ID
  ```
- **Update `initialPanelState`:** Add your new data source ID as a key with an initial value of `false` to the `initialPanelState` object.
  ```typescript
  const initialPanelState: PanelOpenState = {
    // ... other states
    todos: false,
    myData: false, // <-- Add initial state
  };
  ```
- **Render the Panel:** Add a new `div` element for your panel within the panel rendering section at the bottom of the component. Use the `getPanelClasses` helper function with your panel's ID and desired `maxWidthClass` (usually `"max-w-sm"` for data sources). Pass the `handleTogglePanel` function to the panel's `onClose` prop.
  ```typescript
  {
    /* ... other panels ... */
  }
  <div className={getPanelClasses("myData", "max-w-sm")}>
    <MyDataSourcePanel onClose={() => handleTogglePanel("myData")} />
  </div>;
  ```
- The `LeftSidebar` will now automatically render the button for your data source based on the `dataSourceConfig` and handle its visibility using the consolidated state and generic toggle handler.

## 5. Add Context Provider

- Wrap the application (or relevant part of the component tree) with your new context provider. A common place is `src/main.tsx`.
- Import your provider (e.g., `MyDataSourceProvider`) in `src/main.tsx`.
- Add it to the nesting of providers.

**Example (`src/main.tsx`):**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
// ... other provider imports ...
import { MyDataSourceProvider } from "./contexts/MyDataSourceContext.tsx"; // <-- Import your provider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CalendarProvider>
            <HealthProvider>
              <TodosProvider>
                <FinanceProvider>
                  <MyDataSourceProvider>
                    {" "}
                    {/* <-- Wrap App */}
                    <App />
                  </MyDataSourceProvider>
                </FinanceProvider>
              </TodosProvider>
            </HealthProvider>
          </CalendarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
```

## Conclusion

After these steps, your new data source panel should be fully integrated:

- A button with the correct icon and tooltip will appear in the "DATA" section of the `LeftSidebar`.
- Clicking the button will toggle the visibility of your custom panel component.
- Your panel component will use its dedicated context to fetch and display data.
- Only one panel (including data sources, GM, profile, paths) can be open at a time.
