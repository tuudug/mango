import React, { createContext, useContext, ReactNode } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastContextType {
  showToast: (message: string, type?: ToastType, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const showToast = (
    message: string,
    type: ToastType = "info",
    description?: string
  ) => {
    const options = description ? { description } : {};
    switch (type) {
      case "success":
        sonnerToast.success(message, options);
        break;
      case "error":
        sonnerToast.error(message, options);
        break;
      case "warning":
        sonnerToast.warning(message, options);
        break;
      case "info":
      default:
        sonnerToast.info(message, options);
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
