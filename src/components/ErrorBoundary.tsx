import React, { Component, ErrorInfo, ReactNode } from "react";

// Define the expected props for the fallback component
export interface FallbackProps {
  error: Error | null;
  // Explicitly add props passed down from App.tsx via pwaProps
  updateSW?: (reloadPage?: boolean) => Promise<void>;
  needRefresh?: boolean;
}

// Define the props for the ErrorBoundary
interface Props {
  children: ReactNode;
  FallbackComponent?: React.ComponentType<FallbackProps>; // Use FallbackComponent prop
  pwaProps?: {
    // Add pwaProps here to be passed down
    updateSW: (reloadPage?: boolean) => Promise<void>;
    needRefresh: boolean;
  };
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
      // If FallbackComponent is provided, render it with error and pwaProps
      if (this.props.FallbackComponent) {
        const { FallbackComponent, pwaProps } = this.props;
        return (
          <FallbackComponent
            error={this.state.error}
            // Spread pwaProps if they exist
            {...(pwaProps || {})}
          />
        );
      }
      // Default fallback if no FallbackComponent is provided
      return (
        <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
          <div className="text-center p-6 bg-gray-800 rounded-lg shadow-xl">
            <h1 className="text-2xl font-bold text-red-500 mb-4">
              Oops! Something went wrong.
            </h1>
            <p className="mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
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
