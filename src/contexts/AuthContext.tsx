import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "./ToastContext";
import { authenticatedFetch } from "@/lib/apiClient";

interface UserProgress {
  xp: number;
  level: number;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  xp: number;
  level: number;
  fetchUserProgress: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const { showToast } = useToast();

  // Function to fetch user progress (XP and Level)
  const fetchUserProgress = useCallback(
    async (currentSession: Session | null) => {
      // Pass session directly to avoid dependency loop issues
      if (!currentSession) {
        setXp(0);
        setLevel(1);
        return;
      }

      console.log("Fetching user progress...");
      try {
        const progress = await authenticatedFetch<UserProgress>(
          "/api/user/progress",
          "GET",
          currentSession
        );
        setXp(progress.xp);
        setLevel(progress.level);
        console.log("User progress updated:", progress);
      } catch (error) {
        console.error("Failed to fetch user progress:", error);
        setXp(0);
        setLevel(1);
      }
    },
    []
  ); // No dependencies needed here as session is passed in

  // Effect for initial session check (runs once)
  useEffect(() => {
    setIsLoading(true);
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        // Fetch progress immediately after setting initial session
        await fetchUserProgress(initialSession);
        setIsLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect for Auth State Change Listener
  useEffect(() => {
    // Function to establish server-side session
    const establishServerSession = async (token: string | undefined) => {
      if (!token) return;
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
      }
    };

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        // Make listener async
        console.log("Supabase Auth Event:", event, currentSession);
        // Update session/user state first
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Stop loading regardless of event, except maybe initial? (Handled by initial effect now)
        setIsLoading(false); // Ensure loading stops

        if (event === "SIGNED_IN") {
          if (currentSession?.access_token) {
            await establishServerSession(currentSession.access_token);
          }
          // Fetch user progress after sign in state is set
          await fetchUserProgress(currentSession);
        } else if (event === "SIGNED_OUT") {
          // Reset progress on sign out
          setXp(0);
          setLevel(1);
        } else if (event === "TOKEN_REFRESHED") {
          // Optionally re-fetch progress if needed after token refresh
          await fetchUserProgress(currentSession);
        }
        // PASSWORD_RECOVERY doesn't need special handling here anymore
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [fetchUserProgress]); // Keep fetchUserProgress dependency here for the listener

  // --- Other functions remain the same ---

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
      setIsLoading(false); // Stop loading on error
    }
    // Auth listener will handle setting session/user state and fetching progress
    // setIsLoading(false); // Listener handles loading state now
  };

  // Sign up function
  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
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
    setIsLoading(false);
  };

  // Sign out function
  const signOut = async () => {
    setIsLoading(true); // Start loading before sign out
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error signing out:", error.message);
      showToast({
        title: "Sign Out Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false); // Stop loading on error
    }
    // Auth listener will set session/user to null and reset progress
    // setIsLoading(false); // Listener handles loading state
  };

  // Reset Password function
  const resetPasswordForEmail = async (email: string): Promise<boolean> => {
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
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
      return true;
    }
  };

  // Memoize the context value
  const value = useMemo(
    () => ({
      session,
      user,
      isLoading,
      xp,
      level,
      fetchUserProgress: () => fetchUserProgress(session), // Expose a version that uses current session state
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPasswordForEmail,
      updatePassword,
    }),
    [session, user, isLoading, xp, level, fetchUserProgress] // Keep fetchUserProgress in outer scope dependency
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
