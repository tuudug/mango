import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { CalendarProvider } from "./contexts/CalendarContext.tsx";
import { HealthProvider } from "./contexts/HealthContext.tsx";
import { TodosProvider } from "./contexts/TodosContext.tsx";
import { ToastProvider } from "./contexts/ToastContext.tsx";
// Correct the import path for FinanceProvider
import { FinanceProvider } from "./components/datasources/FinanceDataSource.tsx";
import { PomodoroProvider } from "./contexts/PomodoroContext.tsx";
import { AmbienceProvider } from "./contexts/AmbienceContext.tsx"; // Import AmbienceProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <CalendarProvider>
            <HealthProvider>
              <TodosProvider>
                <FinanceProvider>
                  <PomodoroProvider>
                    <AmbienceProvider>
                      {" "}
                      {/* Wrap App with AmbienceProvider */}
                      <App />
                    </AmbienceProvider>
                  </PomodoroProvider>
                </FinanceProvider>
              </TodosProvider>
            </HealthProvider>
          </CalendarProvider>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
