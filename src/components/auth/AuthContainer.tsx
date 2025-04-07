import { useState } from "react";
import { ForgotPasswordForm } from "./ForgotPasswordForm"; // Import the new form
import { LoginForm } from "./LoginForm";
import { SignupForm } from "./SignupForm";

// Define possible view states
type AuthView = "login" | "register" | "forgotPassword";

export function AuthContainer() {
  const [currentView, setCurrentView] = useState<AuthView>("login");

  // Updated toggle function to accept the target view
  const toggleView = (view: AuthView) => {
    setCurrentView(view);
  };

  const renderForm = () => {
    switch (currentView) {
      case "login":
        return <LoginForm onToggleView={toggleView} />;
      case "register":
        // Pass 'login' as the target view when toggling from SignupForm
        return <SignupForm onToggleView={() => toggleView("login")} />;
      case "forgotPassword":
        // Render the actual ForgotPasswordForm
        // Pass 'login' as the target view when toggling back
        return <ForgotPasswordForm onToggleView={() => toggleView("login")} />;
      default:
        return <LoginForm onToggleView={toggleView} />; // Default to login
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      {renderForm()}
    </div>
  );
}
