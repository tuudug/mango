import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider"; // Import ThemeProvider

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* Removed defaultTheme and storageKey props as they are no longer used */}
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);
