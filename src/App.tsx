import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
// Use default imports for these components
import AuthSuccessPage from "./components/auth/AuthSuccessPage";
import { useEffect } from "react"; // Import useEffect
import AuthFailurePage from "./components/auth/AuthFailurePage";
import { useAuth } from "./contexts/AuthContext";
import { useNotification } from "./contexts/NotificationContext"; // Import useNotification
import { AuthContainer } from "./components/auth/AuthContainer";
import { UpdatePasswordForm } from "./components/auth/UpdatePasswordForm"; // Import UpdatePasswordForm
import { Toaster } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
// Use default imports for these components
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorFallback from "./components/ErrorFallback";
import { DashboardConfigProvider } from "./contexts/DashboardConfigContext";

function App() {
  // --- Hooks (MUST be called unconditionally at the top) ---
  const { session, isLoading } = useAuth();
  const { permissionStatus, requestPermission } = useNotification(); // Get notification context
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered:", r);
    },
    onRegisterError(error) {
      console.error("SW registration error:", error);
    },
  });
  // --- End Hooks ---

  // --- Side Effects ---
  // Effect to request notification permission on load if needed
  useEffect(() => {
    // Only run if logged in and permission is currently 'default'
    if (session && permissionStatus === "default") {
      console.log(
        "[App] Requesting notification permission as status is default."
      );
      // Consider adding a small delay or showing a pre-prompt modal here for better UX
      requestPermission();
    }
  }, [session, permissionStatus, requestPermission]); // Re-run if session or status changes
  // --- End Side Effects ---

  // --- Helper Functions ---
  const closePromptUpdate = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };
  // --- End Helper Functions ---

  // --- Props ---
  // Pass PWA update functions to Dashboard and ErrorFallback
  const pwaProps = {
    updateSW: updateServiceWorker,
    needRefresh: needRefresh,
  };
  // --- End Props ---

  // --- Render Logic ---
  // Handle loading state *within* the main return structure
  // Avoid early returns before this point to preserve hook order
  const renderContent = () => {
    if (isLoading && window.location.pathname !== "/update-password") {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
          Loading...
        </div>
      );
    }

    // Main application routes
    return (
      <Routes>
        <Route
          path="/"
          element={
            session ? (
              <DashboardConfigProvider>
                <Dashboard {...pwaProps} />
              </DashboardConfigProvider>
            ) : (
              <Navigate to="/auth" replace />
            )
          }
        />
        <Route
          path="/auth"
          element={!session ? <AuthContainer /> : <Navigate to="/" replace />}
        />
        {/* Add route for updating password */}
        <Route
          path="/update-password"
          element={<UpdatePasswordForm />} // Render the form directly
        />
        <Route path="/auth/success" element={<AuthSuccessPage />} />
        <Route path="/auth/failure" element={<AuthFailurePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  };

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback} pwaProps={pwaProps}>
        {renderContent()} {/* Render loading state or routes */}
      </ErrorBoundary>
      <Toaster position="bottom-right" theme="dark" />
      {(offlineReady || needRefresh) && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-gray-800 border border-gray-700 text-white p-3 rounded-lg shadow-lg flex items-center gap-3">
            <span>
              {offlineReady
                ? "App ready to work offline."
                : "New content available, click reload to update."}
            </span>
            {needRefresh && (
              <button
                onClick={() => updateServiceWorker(true)}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-medium"
              >
                Reload
              </button>
            )}
            <button
              onClick={closePromptUpdate}
              className="px-2 py-1 text-gray-400 hover:text-white text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </BrowserRouter>
  );
}

export default App;
