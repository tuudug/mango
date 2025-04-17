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
          {" "}
          {/* Wrap AuthProvider */}
          <AuthProvider>
            {/* Moved FetchManagerProvider inside other data providers */}
            <CalendarProvider>
              <HealthProvider>
                {/* Corrected Nesting Order */}
                <QuestsProvider>
                  <HabitsProvider>
                    <TodosProvider>
                      <FinanceProvider>
                        <PomodoroProvider>
                          <AmbienceProvider>
                            {/* Wrap FetchManagerProvider with NotificationProvider */}
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
            {/* Removed FetchManagerProvider closing tag from here */}
          </AuthProvider>
        </PanelManagerProvider>{" "}
        {/* Close PanelManagerProvider */}
      </ToastProvider>
    </ThemeProvider>
  </React.StrictMode>
);
