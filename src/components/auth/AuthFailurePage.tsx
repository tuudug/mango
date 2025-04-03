import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button"; // Import Button

const AuthFailurePage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Optional: Add any cleanup logic if needed
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="p-8 bg-gray-800 rounded shadow-md text-center">
        <h2 className="text-2xl font-semibold text-red-400 mb-4">
          Authentication Failed
        </h2>
        <p className="text-gray-300 mb-6">
          Something went wrong during the authentication process. Please try
          again.
        </p>
        <Button onClick={() => navigate("/")}>Go Back to Dashboard</Button>
      </div>
    </div>
  );
};

export default AuthFailurePage;
