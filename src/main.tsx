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
import { PanelManagerProvider } from "./contexts/PanelManagerContext.tsx"; // Import PanelManagerProvider
// Correct the import path for FinanceProvider
import { FinanceProvider } from "./contexts/FinanceContext.tsx"; // Updated import path
import { PomodoroProvider } from "./contexts/PomodoroContext.tsx";
import { AmbienceProvider } from "./contexts/AmbienceContext.tsx"; // Import AmbienceProvider
import { HabitsProvider } from "./contexts/HabitsContext.tsx"; // Import HabitsProvider
import { QuestsProvider } from "./contexts/QuestsContext.tsx"; // Import QuestsProvider
import { NotificationProvider } from "./contexts/NotificationContext.tsx"; // Import NotificationProvider
import { FetchManagerProvider } from "./contexts/FetchManagerContext.tsx"; // Import FetchManagerProvider

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <PanelManagerProvider>
          <AuthProvider>
            <CalendarProvider>
              <HealthProvider>
                <QuestsProvider>
                  <HabitsProvider>
                    <TodosProvider>
                      <FinanceProvider>
                        <PomodoroProvider>
                          <AmbienceProvider>
                            <NotificationProvider>
                              <FetchManagerProvider>
                                <App />
                              </FetchManagerProvider>
                            </NotificationProvider>
                          </AmbienceProvider>
                        </PomodoroProvider>
                      </FinanceProvider>
                    </TodosProvider>
                  </HabitsProvider>
                </QuestsProvider>
              </HealthProvider>
            </CalendarProvider>
          </AuthProvider>
        </PanelManagerProvider>
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
