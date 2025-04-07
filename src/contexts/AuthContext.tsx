import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient"; // Import frontend client
import { useToast } from "./ToastContext"; // Import useToast

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<boolean>; // Added, returns success boolean
  updatePassword: (password: string) => Promise<boolean>; // Added, returns success boolean
  // Add other methods like signInWithGoogle if needed later
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading initially
  const { showToast } = useToast(); // Get showToast function

  // Check initial session state and set up listener
  useEffect(() => {
    setIsLoading(true);
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Function to establish server-side session
    const establishServerSession = async (token: string | undefined) => {
      if (!token) return; // Don't proceed if no token
      try {
        console.log("Attempting to establish server session...");
        const response = await fetch("/api/auth/session-login", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorBody = await response.json();
          throw new Error(
            errorBody.message ||
              `Failed to establish server session: ${response.status}`
          );
        }
        console.log("Server session established successfully.");
      } catch (error) {
        console.error("Error establishing server session:", error);
        // Handle error appropriately - maybe notify user?
        // For now, just log it. The primary Supabase session is still valid.
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Supabase Auth Event:", event, session);
        setSession(session);
        setUser(session?.user ?? null);

        // Handle PASSWORD_RECOVERY event specifically to stop loading
        // The user is redirected here after clicking the email link
        if (event === "PASSWORD_RECOVERY") {
          setIsLoading(false);
        } else {
          // For other events, manage loading state as before
          setIsLoading(false); // Stop loading on auth change
        }

        // If user signs in, establish the server-side session
        if (event === "SIGNED_IN" && session?.access_token) {
          establishServerSession(session.access_token);
        }
        // TODO: Handle SIGNED_OUT - potentially clear server session if needed?
        // Currently, server session might persist until cookie expires.
      }
    );

    // Cleanup listener on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // Sign in function
  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      console.error("Error signing in:", error.message);
      showToast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    // Auth listener will handle setting session/user state
    setIsLoading(false); // Stop loading after attempt
  };

  // Sign up function
  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      // options: { emailRedirectTo: window.location.origin } // Optional: for email confirmation
    });
    if (error) {
      console.error("Error signing up:", error.message);
      showToast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      showToast({
        title: "Sign Up Successful",
        description: "Please check your email for confirmation if enabled.",
      });
    }
    // Auth listener will handle setting session/user state if auto-confirm or after confirmation
    setIsLoading(false); // Stop loading after attempt
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      showToast({
        title: "Sign Out Failed",
        description: error.message,
        variant: "destructive",
      });
    }
    // Auth listener will set session/user to null
    setIsLoading(false); // Stop loading after attempt
  };

  // Reset Password function
  const resetPasswordForEmail = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`, // Redirect URL
    });
    setIsLoading(false);
    if (error) {
      console.error("Error sending password reset email:", error.message);
      showToast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } else {
      showToast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions.",
      });
      return true;
    }
  };

  // Update Password function
  const updatePassword = async (password: string): Promise<boolean> => {
    // Removed the incorrect check: if (!session && event !== "PASSWORD_RECOVERY")
    // Supabase's updateUser implicitly handles the recovery context via the token in the URL

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);
    if (error) {
      console.error("Error updating password:", error.message);
      showToast({
        title: "Password Update Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } else {
      showToast({
        title: "Password Updated Successfully",
        description: "You can now log in with your new password.",
      });
      // Optionally navigate the user away after successful update
      // e.g., navigate('/auth');
      return true;
    }
  };

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPasswordForEmail, // Added
      updatePassword, // Added
    }),
    // Add dependencies for new functions if they rely on state/props changed outside useMemo
    // In this case, they don't directly, but isLoading is used.
    [session, user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use the Auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
