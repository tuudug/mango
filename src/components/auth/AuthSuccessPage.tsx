import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCalendar } from "@/contexts/CalendarContext"; // To potentially trigger refetch

const AuthSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const { confirmGoogleConnection } = useCalendar(); // Get confirm function

  useEffect(() => {
    // Confirm connection (sets state optimistically and fetches)
    confirmGoogleConnection();

    // Redirect back to the main dashboard or a relevant page after a short delay
    const timer = setTimeout(() => {
      navigate("/"); // Redirect to home/dashboard
    }, 1500); // 1.5-second delay (slightly shorter)

    return () => clearTimeout(timer); // Cleanup timer on unmount
  }, [navigate, confirmGoogleConnection]); // Update dependency

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900">
      <div className="p-8 bg-gray-800 rounded shadow-md text-center">
        <h2 className="text-2xl font-semibold text-green-400 mb-4">
          Authentication Successful!
        </h2>
        <p className="text-gray-300">
          Your account has been connected successfully. Redirecting...
        </p>
        {/* Optional: Add a loading spinner */}
      </div>
    </div>
  );
};

export default AuthSuccessPage;
