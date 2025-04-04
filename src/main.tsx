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
import ErrorBoundary from "./components/ErrorBoundary.tsx"; // Import ErrorBoundary
import ErrorFallback from "./components/ErrorFallback.tsx"; // Import Fallback UI

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Wrap EVERYTHING with ErrorBoundary */}
    <ErrorBoundary
      fallback={
        // Fallback UI for top-level errors (won't have PWA context here)
        <ErrorFallback
          error={null}
          updateAvailable={false}
          onUpdate={undefined}
        />
      }
    >
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <CalendarProvider>
              <HealthProvider>
                <TodosProvider>
                  <FinanceProvider>
                    <App />
                  </FinanceProvider>
                </TodosProvider>
              </HealthProvider>
            </CalendarProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
