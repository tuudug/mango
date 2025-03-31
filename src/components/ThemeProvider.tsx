import React, { createContext, useContext, useEffect } from "react"; // Removed useState import

// Removed Theme type and related props/state as theme is now fixed to dark
type ThemeProviderProps = {
  children: React.ReactNode;
  // defaultTheme and storageKey are no longer needed
};

// Simplified state as theme is fixed
type ThemeProviderState = {
  theme: "dark";
  // setTheme is no longer needed for switching
};

const initialState: ThemeProviderState = {
  theme: "dark",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

// Simplified ThemeProvider props and removed state management for theme switching
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Theme is now fixed to 'dark', using const assertion as suggested by ESLint
  const theme = "dark" as const;

  useEffect(() => {
    const root = window.document.documentElement;
    // Always apply 'dark' theme
    root.classList.remove("light"); // Remove light if present
    root.classList.add("dark");
    // No need to check system preferences or theme state
  }, []); // Empty dependency array ensures this runs only once on mount

  // Simplified context value, ensuring theme type matches ThemeProviderState
  const value: ThemeProviderState = {
    theme,
    // setTheme is removed as theme is fixed
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
