import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./scrollbars.css"; // Import custom scrollbar styles
import { AuthProvider } from "./contexts/AuthContext.tsx"; // Import AuthProvider
import { ThemeProvider } from "./components/ThemeProvider.tsx"; // Import ThemeProvider
import { CalendarProvider } from "./contexts/CalendarContext.tsx"; // Import CalendarProvider
import { HealthProvider } from "./contexts/HealthContext.tsx"; // Import HealthProvider
import { TodosProvider } from "./contexts/TodosContext.tsx"; // Import TodosProvider
import { ToastProvider } from "./contexts/ToastContext.tsx"; // Import ToastProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          {" "}
          {/* Wrap relevant providers/App */}
          <CalendarProvider>
            <HealthProvider>
              <TodosProvider>
                <App />
              </TodosProvider>
            </HealthProvider>
          </CalendarProvider>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
