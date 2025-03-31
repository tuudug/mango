import { useState } from "react"; // Import useState
import "./App.css";
import { LoginForm } from "./components/auth/LoginForm";
import { SignupForm } from "./components/auth/SignupForm";
import { Dashboard } from "./components/Dashboard";
import { Button } from "./components/ui/button";
import { useAuth } from "./contexts/AuthContext";

function App() {
  const { user, session, signOut, isLoading } = useAuth();
  const [showLogin, setShowLogin] = useState(true); // State to toggle between login/signup

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  // If user is logged in (session exists), show the Dashboard
  if (session && user) {
    return (
      <div className="h-full w-full">
        {" "}
        {/* Remove relative positioning */}
        <Dashboard />
        {/* Logout button is now handled within UserProfilePanel inside Dashboard */}
      </div>
    );
  }

  // If user is not logged in, show Login or Signup form
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
}

export default App;
