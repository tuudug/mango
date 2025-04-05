import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./components/Dashboard";
// Use default imports for these components
import AuthSuccessPage from "./components/auth/AuthSuccessPage";
import AuthFailurePage from "./components/auth/AuthFailurePage";
import { useAuth } from "./contexts/AuthContext";
import { SignupForm } from "./components/auth/SignupForm";
import { LoginForm } from "./components/auth/LoginForm";
import { Toaster } from "sonner";
import { useRegisterSW } from "virtual:pwa-register/react";
// Use default imports for these components
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorFallback from "./components/ErrorFallback";
// Removed: import { PomodoroBanner } from "./components/PomodoroBanner"; // Remove banner import

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
    // You might want a more sophisticated loading screen later
    // Add centering styles to the loading indicator as well
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        Loading...
      </div>
    );
  }

  return (
    <BrowserRouter>
      {/* Removed Pomodoro Banner from here */}
      {/* Use FallbackComponent prop and pass pwaProps */}
      <ErrorBoundary FallbackComponent={ErrorFallback} pwaProps={pwaProps}>
        <Routes>
          <Route
            path="/"
            element={
              session ? (
                <Dashboard {...pwaProps} />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
          <Route
            path="/login"
            element={
              !session ? (
                // Wrap LoginForm with centering div
                <div className="flex items-center justify-center min-h-screen bg-gray-950">
                  <LoginForm />
                </div>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route
            path="/signup"
            element={
              !session ? (
                // Wrap SignupForm as well for consistency
                <div className="flex items-center justify-center min-h-screen bg-gray-950">
                  <SignupForm />
                </div>
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
          <Route path="/auth/success" element={<AuthSuccessPage />} />
          <Route path="/auth/failure" element={<AuthFailurePage />} />
          {/* Add other routes as needed */}
          <Route path="*" element={<Navigate to="/" replace />} />{" "}
          {/* Catch-all */}
        </Routes>
      </ErrorBoundary>
      {/* Toast container */}
      <Toaster position="bottom-right" theme="dark" />
      {/* PWA Update Toast (Example) */}
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
