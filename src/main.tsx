import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { ToastProvider } from "./contexts/ToastContext.tsx"; // Import ToastProvider
import { CalendarProvider } from "./contexts/CalendarContext.tsx"; // Import CalendarProvider
import { HealthProvider } from "./contexts/HealthContext.tsx"; // Import HealthProvider
import { TodosProvider } from "./contexts/TodosContext.tsx"; // Import TodosProvider
import { FinanceProvider } from "./components/datasources/FinanceDataSource.tsx"; // Import FinanceProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        {" "}
        {/* Wrap with ToastProvider */}
        <AuthProvider>
          <CalendarProvider>
            {" "}
            {/* Wrap with CalendarProvider */}
            <HealthProvider>
              {" "}
              {/* Wrap with HealthProvider */}
              <TodosProvider>
                {" "}
                {/* Wrap with TodosProvider */}
                <FinanceProvider>
                  {" "}
                  {/* Wrap with FinanceProvider */}
                  <App />
                </FinanceProvider>
              </TodosProvider>
            </HealthProvider>
          </CalendarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
