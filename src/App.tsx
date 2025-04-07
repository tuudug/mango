import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
// Use default imports for these components
import AuthSuccessPage from "./components/auth/AuthSuccessPage";
import AuthFailurePage from "./components/auth/AuthFailurePage";
import { useAuth } from "./contexts/AuthContext";
import { AuthContainer } from "./components/auth/AuthContainer";
import { UpdatePasswordForm } from "./components/auth/UpdatePasswordForm"; // Import UpdatePasswordForm
import { Toaster } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
// Use default imports for these components
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorFallback from "./components/ErrorFallback";
import { DashboardConfigProvider } from "./contexts/DashboardConfigContext";

function App() {
  const { session, isLoading } = useAuth();

  // PWA Update Logic
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

  const closePromptUpdate = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  // Pass PWA update functions to Dashboard and ErrorFallback
  const pwaProps = {
    updateSW: updateServiceWorker,
    needRefresh: needRefresh,
  };

  if (isLoading) {
    // Show loading indicator only if not on the update-password route
    // because AuthContext handles its own loading state there
    if (window.location.pathname !== "/update-password") {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
          Loading...
        </div>
      );
    }
    // Otherwise, allow UpdatePasswordForm to render and handle its loading state
  }

  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={ErrorFallback} pwaProps={pwaProps}>
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
