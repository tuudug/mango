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
import { Database } from "../types/supabase"; // Correct relative path for types

interface UserProgress {
  xp: number;
  level: number;
}

// Define UserSettings type based on Supabase schema
type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"] | null;

// Define the main context type *once*
interface AuthContextType {
  session: Session | null;
  user: User | null;
  userSettings: UserSettings; // Add user settings state
  isLoading: boolean;
  xp: number;
  level: number;
  fetchUserProgress: () => Promise<void>;
  // fetchUserSettings: () => Promise<void>; // Maybe combine fetching
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
  const [userSettings, setUserSettings] = useState<UserSettings>(null); // Add state for settings
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const { showToast } = useToast();
  const [initialTimezoneCheckDone, setInitialTimezoneCheckDone] =
    useState(false); // Flag to prevent multiple checks

  // Function to fetch user progress (XP and Level)
  const fetchUserProgress = useCallback(
    async (currentSession: Session | null) => {
      // Pass session directly to avoid dependency loop issues
      if (!currentSession) {
        setXp(0);
        setLevel(1);
        // Also clear settings if no session
        setUserSettings(null);
        setInitialTimezoneCheckDone(false); // Reset flag on sign out
        return;
      }

      // console.log("Fetching user progress..."); // Reduce noise
      try {
        const progress = await authenticatedFetch<UserProgress>(
          "/api/user/progress",
          "GET",
          currentSession
        );
        setXp(progress.xp ?? 0); // Use nullish coalescing for safety
        setLevel(progress.level ?? 1);
        // console.log("User progress updated:", progress);
      } catch (error) {
        console.error("[AuthContext] Failed to fetch user progress:", error);
        setXp(0);
        setLevel(1);
      }
    },
    []
  );

  // Function to fetch user settings
  const fetchUserSettings = useCallback(
    async (currentSession: Session | null) => {
      if (!currentSession) {
        setUserSettings(null);
        setInitialTimezoneCheckDone(false); // Reset flag
        return;
      }
      // console.log("Fetching user settings...");
      try {
        const settings = await authenticatedFetch<UserSettings>(
          "/api/user/settings",
          "GET",
          currentSession
        );
        setUserSettings(settings); // settings can be null if not found
        // console.log("User settings updated:", settings);
        return settings; // Return settings for immediate use
      } catch (error) {
        console.error("[AuthContext] Failed to fetch user settings:", error);
        setUserSettings(null);
        return null;
      }
    },
    []
  );

  // Function to update user settings (specifically timezone for now)
  const updateTimezoneSetting = useCallback(
    async (timezone: string, currentSession: Session | null) => {
      if (!currentSession || !timezone) return;
      console.log(
        `[AuthContext] Attempting to update timezone to: ${timezone}`
      );
      try {
        const updatedSettings = await authenticatedFetch<UserSettings>(
          "/api/user/settings",
          "PUT",
          currentSession,
          { timezone } // Send only the timezone field
        );
        setUserSettings(updatedSettings); // Update local state with the response
        console.log(
          "[AuthContext] Timezone updated successfully:",
          updatedSettings
        );
      } catch (error) {
        console.error(
          "[AuthContext] Failed to update timezone setting:",
          error
        );
        // Optionally show a toast to the user
      }
    },
    []
  );

  // Effect for initial session check (runs once)
  useEffect(() => {
    setIsLoading(true);
    supabase.auth
      .getSession()
      .then(async ({ data: { session: initialSession } }) => {
        // Fetch initial data in parallel
        const [fetchedSession, fetchedSettings] = await Promise.all([
          supabase.auth.getSession(),
          fetchUserSettings(initialSession), // Fetch settings early
        ]);

        const currentInitialSession = fetchedSession.data.session;
        setSession(currentInitialSession);
        setUser(currentInitialSession?.user ?? null);
        setUserSettings(fetchedSettings); // Set initial settings state

        // Fetch progress after session is confirmed
        await fetchUserProgress(currentInitialSession);

        // Check timezone after fetching initial settings
        if (
          currentInitialSession &&
          fetchedSettings?.timezone === null &&
          !initialTimezoneCheckDone
        ) {
          const detectedTimezone =
            Intl.DateTimeFormat().resolvedOptions().timeZone;
          if (detectedTimezone) {
            console.log(
              `[AuthContext] User timezone is null, attempting to set detected timezone: ${detectedTimezone}`
            );
            await updateTimezoneSetting(
              detectedTimezone,
              currentInitialSession
            );
            setInitialTimezoneCheckDone(true); // Mark as done for this session load
          }
        } else if (fetchedSettings?.timezone) {
          setInitialTimezoneCheckDone(true); // Mark as done if timezone already exists
        }

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
        // Fetch settings and progress in parallel when auth state changes
        const [newSettings] = await Promise.all([
          fetchUserSettings(currentSession),
          fetchUserProgress(currentSession), // Fetch progress as well
        ]);

        // Update session/user state
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        setUserSettings(newSettings); // Update settings state

        // Stop loading
        setIsLoading(false);

        if (event === "SIGNED_IN") {
          if (currentSession?.access_token) {
            await establishServerSession(currentSession.access_token);
          }
          // Check timezone after sign-in if needed
          if (
            currentSession &&
            newSettings?.timezone === null &&
            !initialTimezoneCheckDone
          ) {
            const detectedTimezone =
              Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (detectedTimezone) {
              console.log(
                `[AuthContext] User timezone is null after SIGNED_IN, attempting to set detected timezone: ${detectedTimezone}`
              );
              await updateTimezoneSetting(detectedTimezone, currentSession);
              setInitialTimezoneCheckDone(true); // Mark as done
            }
          } else if (newSettings?.timezone) {
            setInitialTimezoneCheckDone(true); // Mark as done if timezone exists
          }
        } else if (event === "SIGNED_OUT") {
          // Reset progress and settings state handled by fetchUserSettings/fetchUserProgress called above
          setInitialTimezoneCheckDone(false); // Reset flag on sign out
        }
        // TOKEN_REFRESHED - progress/settings already fetched above
        // PASSWORD_RECOVERY - no specific action needed here
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
    // Add fetchUserSettings and updateTimezoneSetting to dependencies
  }, [
    fetchUserProgress,
    fetchUserSettings,
    updateTimezoneSetting,
    initialTimezoneCheckDone,
  ]);

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
      userSettings, // Expose settings
      isLoading,
      xp,
      level,
      fetchUserProgress: () => fetchUserProgress(session),
      // fetchUserSettings: () => fetchUserSettings(session), // Expose if needed elsewhere
      signInWithEmail,
      signUpWithEmail,
      signOut,
      resetPasswordForEmail,
      updatePassword,
    }),
    // Add userSettings to dependency array
    [session, user, userSettings, isLoading, xp, level, fetchUserProgress]
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
