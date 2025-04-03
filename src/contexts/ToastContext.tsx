import React, { createContext, useContext, ReactNode } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

// Define the structure for toast options, mirroring sonner's capabilities
interface ToastOptions {
  title: string;
  description?: string;
  // Allow 'destructive' as input, map it to 'error' for sonner
  variant?: "success" | "error" | "info" | "warning" | "destructive";
  // Add other sonner options here if needed (e.g., duration, action)
}

interface ToastContextType {
  // Update showToast to accept the options object
  showToast: (options: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  // Update showToast implementation to use the options object
  const showToast = (options: ToastOptions) => {
    // Map 'destructive' variant to 'error' for sonner function calls
    const { title, description, variant: inputVariant = "info" } = options;
    const sonnerOptions = description ? { description } : {};
    const variant = inputVariant === "destructive" ? "error" : inputVariant; // Map destructive to error

    switch (variant) {
      case "success":
        sonnerToast.success(title, sonnerOptions);
        break;
      case "error": // Handles both 'error' and 'destructive' inputs
        sonnerToast.error(title, sonnerOptions);
        break;
      case "warning":
        sonnerToast.warning(title, sonnerOptions);
        break;
      case "info":
      default:
        sonnerToast.info(title, sonnerOptions);
        break;
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Render the Toaster component here. Adjust position, theme, etc. as needed */}
      <Toaster position="bottom-right" richColors closeButton theme="dark" />
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
