import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
import { Label } from "@/components/ui/label"; // Added missing Label import
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define props type
interface ForgotPasswordFormProps {
  onToggleView: (view: "login") => void; // Expects 'login' to go back
}

export function ForgotPasswordForm({ onToggleView }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const { resetPasswordForEmail, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await resetPasswordForEmail(email);
    if (success) {
      // Optionally clear email field or show persistent success message
      // setEmail(""); // Example: clear field on success
      // The toast notification is handled in AuthContext
    }
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Forgot Password</CardTitle>
        <CardDescription>
          Enter your email address and we'll send you a link to reset your
          password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-forgot">Email</Label>
            <Input
              id="email-forgot" // Use unique ID
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button
          variant="link"
          onClick={() => onToggleView("login")}
          disabled={isLoading}
        >
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  );
}
