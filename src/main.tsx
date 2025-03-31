import React from "react"; // Import React
import ReactDOM from "react-dom/client"; // Import ReactDOM
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx"; // Import AuthProvider
import { CalendarProvider } from "./contexts/CalendarContext.tsx";
import { HealthProvider } from "./contexts/HealthContext.tsx";
import { TodosProvider } from "./contexts/TodosContext.tsx";

// Get the root element
const rootElement = document.getElementById("root");

if (rootElement) {
  // Create root using ReactDOM
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      {/* Wrap entire app with AuthProvider */}
      <AuthProvider>
        {/* Remove defaultTheme and storageKey props as they are not accepted */}
        <ThemeProvider>
          {/* Other providers */}
          <TodosProvider>
            <HealthProvider>
              <CalendarProvider>
                <App />
              </CalendarProvider>
            </HealthProvider>
          </TodosProvider>
        </ThemeProvider>
      </AuthProvider>
    </React.StrictMode>
  );
} else {
  console.error("Failed to find the root element");
}
