import React from "react";
import { Button } from "@/components/ui/button"; // Assuming Button component exists
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorFallbackProps {
  error: Error | null;
  onUpdate?: () => void; // Function to trigger PWA update
  updateAvailable?: boolean; // Flag indicating if an update is ready
}

const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  onUpdate,
  updateAvailable,
}) => {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white p-4">
      <div className="text-center p-6 md:p-8 bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h1 className="text-xl md:text-2xl font-bold text-red-400 mb-3">
          Oops! Something Went Wrong
        </h1>
        <p className="mb-4 text-gray-300 text-sm md:text-base">
          An unexpected error occurred. This might be because the app is out of
          date.
        </p>

        {/* Update Button */}
        {onUpdate && updateAvailable && (
          <Button
            onClick={onUpdate}
            className="mb-4 w-full bg-indigo-600 hover:bg-indigo-700"
            size="lg"
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Update App Now
          </Button>
        )}

        {/* Refresh Button as an alternative */}
        <Button
          onClick={handleRefresh}
          variant="outline"
          className="w-full"
          size="lg"
        >
          Refresh Page
        </Button>

        {/* Display error details in development or if needed */}
        {error && process.env.NODE_ENV === "development" && (
          <details className="mt-6 text-left">
            <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-400">
              Error Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-700 rounded text-xs overflow-auto max-h-40 text-gray-300">
              {error.toString()}
              {error.stack && `\n\nStack Trace:\n${error.stack}`}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
};

export default ErrorFallback;
