import { Component, ErrorInfo, ReactNode } from "react";

// Define the props for the ErrorBoundary
interface Props {
  children: ReactNode;
  fallback?: ReactNode; // Optional custom fallback UI
}

// Define the state for the ErrorBoundary
interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  // Initialize the state
  public state: State = {
    hasError: false,
    error: null,
  };

  // Static method to update state when an error is thrown by a descendant component
  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  // Method called after an error has been thrown by a descendant component
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service here
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  // Render method
  public render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      // For now, just a simple message. We'll create a dedicated component next.
      // If a custom fallback prop is provided, render that instead.
      if (this.props.fallback) {
        return this.props.fallback;
      }
      // Default fallback
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Oops! Something went wrong.
            </h1>
            <p className="mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            {/* We will add an update button here later */}
            {this.state.error && (
              <pre className="mt-4 p-2 bg-gray-700 rounded text-left text-xs overflow-auto max-h-40">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    // Normally, just render children
    return this.props.children;
  }
}

export default ErrorBoundary;
