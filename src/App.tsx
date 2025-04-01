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

// Component to handle the main logic (Dashboard or Auth forms)
function MainContent() {
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
    return <Dashboard />;
  }

  return (
    <div className="flex flex-col justify-center items-center h-screen bg-gray-100 dark:bg-gray-900">
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
  // Removed stray closing tags here
}

// Main App component with routing
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainContent />} />
        <Route path="/auth-success" element={<AuthSuccessPage />} />
        <Route path="/login-failure" element={<AuthFailurePage />} />
        {/* Add other routes here if needed */}
      </Routes>
    </Router>
  );
}

export default App;
