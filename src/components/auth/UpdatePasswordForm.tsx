import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext"; // Import useToast
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { updatePassword, isLoading } = useAuth(); // Get session too
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [isReady, setIsReady] = useState(false); // State to wait for session check

  // Supabase triggers PASSWORD_RECOVERY event on redirect
  // We need to wait for the session/event to be processed by AuthContext
  useEffect(() => {
    // Give AuthContext a moment to process the event
    const timer = setTimeout(() => {
      // Check if session is available after the event (might still be null but event processed)
      // Or rely on isLoading becoming false after the event is handled
      if (!isLoading) {
        setIsReady(true);
      }
    }, 500); // Adjust delay if needed

    return () => clearTimeout(timer);
  }, [isLoading]); // Depend on isLoading from AuthContext

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }
    if (password.length < 6) {
      showToast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    const success = await updatePassword(password);
    if (success) {
      // Password updated successfully, redirect to login
      navigate("/auth"); // Redirect to the main auth page
    }
    // Error toast is handled within updatePassword in AuthContext
  };

  // Show loading or message while waiting for AuthContext event
  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Verifying reset token...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <Card className="w-[350px]">
        <CardHeader>
          <CardTitle>Update Password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                minLength={6} // Basic validation
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                minLength={6} // Basic validation
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
        {/* No footer needed as success redirects */}
      </Card>
    </div>
  );
}
