import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider"; // Import ThemeProvider
// Import the new context providers
import { CalendarProvider } from "./contexts/CalendarContext";
import { HealthProvider } from "./contexts/HealthContext";
import { TodosProvider } from "./contexts/TodosContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      {/* Wrap App with the data source providers */}
      <CalendarProvider>
        <HealthProvider>
          <TodosProvider>
            <App />
          </TodosProvider>
        </HealthProvider>
      </CalendarProvider>
    </ThemeProvider>
  </StrictMode>
);
