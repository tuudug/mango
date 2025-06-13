import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
// CalendarProvider import removed
// HealthProvider import removed
// TodosProvider import removed
// PanelManagerProvider import removed
// Correct the import path for FinanceProvider
// FinanceProvider import removed
// PomodoroProvider import removed
// AmbienceProvider import removed
// HabitsProvider import removed
// QuestsProvider import removed
// NotificationProvider import removed
// FetchManagerProvider import removed
// SparksProvider import removed

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      {/* PanelManagerProvider wrapping removed, SparksProvider is now a direct child of ThemeProvider */}
      {/* AuthProvider has been removed, SparksProvider is now a direct child of PanelManagerProvider */}
      {/* SparksProvider wrapping removed */}
      {/* CalendarProvider wrapping removed */}
      {/* HealthProvider wrapping removed */}
      {/* QuestsProvider wrapping removed */}
        {/* HabitsProvider wrapping removed */}
        {/* TodosProvider wrapping removed */}
        {/* FinanceProvider wrapping removed */}
        {/* PomodoroProvider wrapping removed */}
        {/* AmbienceProvider wrapping removed */}
        {/* NotificationProvider wrapping removed */}
        {/* FetchManagerProvider wrapping removed */}
        <App />
    </ThemeProvider>
  </React.StrictMode>
);
