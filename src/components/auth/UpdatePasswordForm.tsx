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
import { useAuthStore } from "@/stores/authStore";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToastStore } from "@/stores/toastStore";

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const { updatePassword, isLoading, session } = useAuthStore(); // Get session too, it's used by updatePassword
  const { showToast } = useToastStore();
  const navigate = useNavigate();
  // showToast is now called from within useAuthStore actions
  const [isReady, setIsReady] = useState(false); // State to wait for session check

  // Supabase triggers PASSWORD_RECOVERY event on redirect
  // We need to wait for the session/event to be processed by AuthStore
  useEffect(() => {
    // The isLoading state in useAuthStore is set to false after the
    // PASSWORD_RECOVERY event is handled by the onAuthStateChange listener.
    // So, we can rely on isLoading becoming false.
    if (!isLoading) {
      // Additionally, ensure the session is actually recovered (user is present)
      // which indicates the token was valid and processed.
      // If there's no user, it means the recovery link might have been invalid or expired.
      if (session?.user) {
        setIsReady(true);
      } else {
        // If no user after loading, means recovery failed or no valid token
        // navigate("/auth"); // Redirect to login if recovery state is not valid
        // It might be better to show an error message here or let the form submission fail
        // For now, let's allow the form to render, and updatePassword will fail if no session.
        setIsReady(true); // Allow form to render, updatePassword handles session check.
      }
    }
  }, [isLoading, session, navigate]); // Depend on isLoading and session from AuthStore

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
