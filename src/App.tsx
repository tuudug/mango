import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // Import routing components
import "./App.css";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { Dashboard } from "./components/Dashboard";
import { Button } from "./components/ui/button";
import { useAuth } from "./contexts/AuthContext";
import AuthSuccessPage from "./components/auth/AuthSuccessPage"; // Import success page
import AuthFailurePage from "./components/auth/AuthFailurePage"; // Import failure page
// Removed ErrorBoundary imports as it's now in main.tsx
// import ErrorBoundary from "./components/ErrorBoundary";
// import ErrorFallback from "./components/ErrorFallback";
import { useRegisterSW } from "virtual:pwa-register/react"; // Import PWA hook

// Component to handle the main logic (Dashboard or Auth forms)
// Pass PWA update props down
function MainContent({
  updateSW,
  needRefresh,
}: {
  updateSW: () => void;
  needRefresh: boolean;
}) {
  const { user, session, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (session && user) {
    // Pass PWA props to Dashboard (which likely passes to Header)
    return <Dashboard updateSW={updateSW} needRefresh={needRefresh} />;
  }

  // Auth forms don't need PWA props directly
  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-900">
      {showLogin ? <LoginForm /> : <SignupForm />}
      <Button
        variant="link"
        className="mt-4"
        onClick={() => setShowLogin(!showLogin)}
      >
        {showLogin
          ? "Don't have an account? Sign Up"
          : "Already have an account? Login"}
      </Button>
    </div>
  );
}

// Main App component with routing and PWA logic
function App() {
  // Call PWA hook here
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, r) {
      console.log(`Service Worker registered: ${swUrl}`);
      // Optional: Send message to SW for immediate claim?
      // r?.active?.postMessage({ type: 'SKIP_WAITING' });
    },
    onRegisterError(error) {
      console.error("Service Worker registration error:", error);
    },
  });

  // Function to wrap updateServiceWorker for potential future logic
  const handleUpdate = () => {
    updateServiceWorker(true); // Pass true to reload the page after update
  };

  return (
    <Router>
      {/* ErrorBoundary wrapper removed, now handled in main.tsx */}
      <Routes>
        <Route
          path="/"
          element={
            <MainContent updateSW={handleUpdate} needRefresh={needRefresh} />
          }
        />
        <Route path="/auth-success" element={<AuthSuccessPage />} />
        <Route path="/login-failure" element={<AuthFailurePage />} />
        {/* Add other routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;
