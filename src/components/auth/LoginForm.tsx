import React, { useState } from "react";
import { useAuthStore } from "@/stores/authStore"; // Import useAuthStore
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Define props type
interface LoginFormProps {
  onToggleView: (view: "register" | "forgotPassword") => void; // Updated prop type
}

export function LoginForm({ onToggleView }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { signInWithEmail, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password);
    // Consider redirecting or showing success message based on context state
  };

  return (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your email and password to login.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="m@example.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              {" "}
              {/* Flex container for label and link */}
              <Label htmlFor="password">Password</Label>
              <Button
                type="button" // Important: prevent form submission
                variant="ghost"
                className="px-0 h-auto text-sm text-blue-500 hover:text-blue-700 bg-transparent px-2" // Remove bg and style as link
                onClick={() => onToggleView("forgotPassword")} // Call toggle with specific view
                disabled={isLoading}
              >
                Forgot Password?
              </Button>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        {/* Updated onClick handler */}
        <Button
          variant="link"
          onClick={() => onToggleView("register")}
          disabled={isLoading}
        >
          Don't have an account? Register
        </Button>
      </CardFooter>
    </Card>
  );
}
