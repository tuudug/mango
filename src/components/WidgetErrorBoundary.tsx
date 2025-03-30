import React, { ErrorInfo } from "react"; // Import ErrorInfo
import { ErrorBoundary } from "react-error-boundary"; // Removed FallbackProps
import { AlertTriangle } from "lucide-react"; // Use an icon for the error

// Fallback component to display when an error occurs
// Remove props argument entirely as none are used
function ErrorFallback() {
  return (
    <div
      role="alert"
      className="p-2 h-full w-full flex flex-col items-center justify-center bg-red-50 border border-red-200 rounded-lg text-red-700"
    >
      <AlertTriangle className="w-6 h-6 mb-2 text-red-500" />
      <p className="text-sm font-medium">Widget Error!</p>
      <p className="text-xs mt-1 text-center">
        Something went wrong with this widget.
      </p>
      {/* Optionally display error details during development */}
      {/* <pre className="mt-2 text-xs text-red-500 overflow-auto max-h-20">{error.message}</pre> */}
    </div>
  );
}

// Log error to console (or could send to an error reporting service)
// Use React.ErrorInfo for the info parameter type
const logError = (error: Error, info: ErrorInfo) => {
  console.error("Widget Error Boundary Caught:", error, info.componentStack); // Log specifically the component stack
};

interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
  widgetId: string; // Pass widget ID for context in logs/fallback
}

export const WidgetErrorBoundary: React.FC<WidgetErrorBoundaryProps> = ({
  children,
  widgetId,
}) => {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={logError}
      // Reset the boundary's state if the widgetId changes (e.g., if layout reorders significantly)
      // This might not be strictly necessary depending on how state is managed.
      resetKeys={[widgetId]}
    >
      {children}
    </ErrorBoundary>
  );
};
