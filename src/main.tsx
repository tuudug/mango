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
import { FinanceProvider } from "./contexts/FinanceContext.tsx"; // Updated import path
import { PomodoroProvider } from "./contexts/PomodoroContext.tsx";
import { AmbienceProvider } from "./contexts/AmbienceContext.tsx"; // Import AmbienceProvider
import { HabitsProvider } from "./contexts/HabitsContext.tsx"; // Import HabitsProvider
import { QuestsProvider } from "./contexts/QuestsContext.tsx"; // Import QuestsProvider

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
                      <HabitsProvider>
                        <QuestsProvider>
                          {" "}
                          {/* Wrap App with QuestsProvider */}
                          <App />
                        </QuestsProvider>
                      </HabitsProvider>
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
