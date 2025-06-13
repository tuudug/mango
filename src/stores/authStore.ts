import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { useToastStore } from '@/stores/toastStore';
import { authenticatedFetch } from '@/lib/apiClient';
import { Database } from '@/types/supabase';

interface UserProgress {
  xp: number;
  level: number;
}

type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"] | null;

interface AuthState {
  session: Session | null;
  user: User | null;
  userSettings: UserSettings;
  isLoading: boolean;
  xp: number;
  level: number;
  initialTimezoneCheckDone: boolean;
  fetchUserProgress: (currentSession: Session | null) => Promise<void>;
  fetchUserSettings: (currentSession: Session | null) => Promise<UserSettings | null>;
  updateTimezoneSetting: (timezone: string, currentSession: Session | null) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPasswordForEmail: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  _initializeAuthStateListener: () => () => void; // Internal action to setup listener
  // Helper to establish server session, to be defined below
  _establishServerSession: (token: string | undefined) => Promise<void>;
}

// Helper function (to be defined inside or outside create, or imported)
async function establishServerSession(token: string | undefined) {
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
    // Not showing toast here as it might be too intrusive for a background process
  }
}


export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  userSettings: null,
  isLoading: true,
  xp: 0,
  level: 1,
  initialTimezoneCheckDone: false,

  _establishServerSession: establishServerSession,

  fetchUserProgress: async (currentSession) => {
    if (!currentSession) {
      set({ xp: 0, level: 1, userSettings: null, initialTimezoneCheckDone: false });
      return;
    }
    try {
      const progress = await authenticatedFetch<UserProgress>(
        "/api/user/progress",
        "GET",
        currentSession
      );
      set({ xp: progress.xp ?? 0, level: progress.level ?? 1 });
    } catch (error) {
      console.error("[AuthStore] Failed to fetch user progress:", error);
      set({ xp: 0, level: 1 }); // Reset on error
    }
  },

  fetchUserSettings: async (currentSession) => {
    if (!currentSession) {
      set({ userSettings: null, initialTimezoneCheckDone: false });
      return null;
    }
    try {
      const settings = await authenticatedFetch<UserSettings>(
        "/api/user/settings",
        "GET",
        currentSession
      );
      set({ userSettings: settings });
      return settings;
    } catch (error) {
      console.error("[AuthStore] Failed to fetch user settings:", error);
      set({ userSettings: null });
      return null;
    }
  },

  updateTimezoneSetting: async (timezone, currentSession) => {
    if (!currentSession || !timezone) return;
    console.log(`[AuthStore] Attempting to update timezone to: ${timezone}`);
    try {
      const updatedSettings = await authenticatedFetch<UserSettings>(
        "/api/user/settings",
        "PUT",
        currentSession,
        { timezone }
      );
      set({ userSettings: updatedSettings });
      console.log("[AuthStore] Timezone updated successfully:", updatedSettings);
    } catch (error) {
      console.error("[AuthStore] Failed to update timezone setting:", error);
      // Toast is optional here, as it's a background process
    }
  },

  signInWithEmail: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[AuthStore] Error signing in:", error.message);
      useToastStore.getState().showToast({
        title: "Sign In Failed",
        description: error.message,
        variant: "destructive",
      });
      set({ isLoading: false });
    }
    // isLoading will be set to false by the auth state listener if successful
  },

  signUpWithEmail: async (email, password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      console.error("[AuthStore] Error signing up:", error.message);
      useToastStore.getState().showToast({
        title: "Sign Up Failed",
        description: error.message,
        variant: "destructive",
      });
    } else {
      useToastStore.getState().showToast({
        title: "Sign Up Successful",
        description: "Please check your email for confirmation if enabled.",
      });
    }
    set({ isLoading: false });
  },

  signOut: async () => {
    set({ isLoading: true });
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("[AuthStore] Error signing out:", error.message);
      useToastStore.getState().showToast({
        title: "Sign Out Failed",
        description: error.message,
        variant: "destructive",
      });
      set({ isLoading: false });
    }
    // isLoading will be set to false by the auth state listener
  },

  resetPasswordForEmail: async (email) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    set({ isLoading: false });
    if (error) {
      console.error("[AuthStore] Error sending password reset email:", error.message);
      useToastStore.getState().showToast({
        title: "Password Reset Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } else {
      useToastStore.getState().showToast({
        title: "Password Reset Email Sent",
        description: "Please check your email for instructions.",
      });
      return true;
    }
  },

  updatePassword: async (password) => {
    set({ isLoading: true });
    const { error } = await supabase.auth.updateUser({ password });
    set({ isLoading: false });
    if (error) {
      console.error("[AuthStore] Error updating password:", error.message);
      useToastStore.getState().showToast({
        title: "Password Update Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    } else {
      useToastStore.getState().showToast({
        title: "Password Updated Successfully",
        description: "You can now log in with your new password.",
      });
      return true;
    }
  },

  _initializeAuthStateListener: () => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        const { fetchUserSettings, fetchUserProgress, updateTimezoneSetting, _establishServerSession } = get();

        console.log("[AuthStore] Supabase Auth Event:", event, currentSession?.user?.id);

        // Fetch settings and progress in parallel
        const [newSettings] = await Promise.all([
          fetchUserSettings(currentSession),
          fetchUserProgress(currentSession),
        ]);

        set({ session: currentSession, user: currentSession?.user ?? null, userSettings: newSettings ?? null, isLoading: false });

        if (event === 'SIGNED_IN') {
          if (currentSession?.access_token) {
            await _establishServerSession(currentSession.access_token);
          }
          if (currentSession && newSettings?.timezone === null && !get().initialTimezoneCheckDone) {
            const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            if (detectedTimezone) {
              console.log(`[AuthStore] User timezone is null after SIGNED_IN, attempting to set detected timezone: ${detectedTimezone}`);
              await updateTimezoneSetting(detectedTimezone, currentSession);
              set({ initialTimezoneCheckDone: true });
            }
          } else if (newSettings?.timezone) {
            set({ initialTimezoneCheckDone: true });
          }
        } else if (event === 'SIGNED_OUT') {
          set({
            initialTimezoneCheckDone: false,
            xp: 0, // Reset XP
            level: 1, // Reset level
            userSettings: null // Clear settings
          });
        } else if (event === 'USER_UPDATED') {
            // This event fires after password update, user metadata change, etc.
            // Refetch user-specific data if necessary.
            // For now, we assume fetchUserProgress and fetchUserSettings called above are sufficient.
            console.log("[AuthStore] User updated event received.");
        } else if (event === 'PASSWORD_RECOVERY') {
             console.log("[AuthStore] Password recovery event.");
             // isLoading should be false to allow UpdatePasswordForm to render
             set({ isLoading: false });
        }
      }
    );
    return () => {
      console.log("[AuthStore] Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
    };
  },
}));

// Initial data fetch and listener setup
(async () => {
  const { _initializeAuthStateListener, fetchUserSettings, fetchUserProgress, updateTimezoneSetting } = useAuthStore.getState();

  // Set isLoading to true before starting any async operations
  useAuthStore.setState({ isLoading: true });

  _initializeAuthStateListener(); // Setup the listener

  try {
    const { data: { session: initialSession } } = await supabase.auth.getSession();

    // Set session and user early, but keep isLoading true until all initial data is fetched
    useAuthStore.setState({ session: initialSession, user: initialSession?.user ?? null });

    const fetchedSettings = await fetchUserSettings(initialSession);
    await fetchUserProgress(initialSession);

    if (initialSession && fetchedSettings?.timezone === null && !useAuthStore.getState().initialTimezoneCheckDone) {
      const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detectedTimezone) {
        await updateTimezoneSetting(detectedTimezone, initialSession);
        useAuthStore.setState({ initialTimezoneCheckDone: true });
      }
    } else if (fetchedSettings?.timezone) {
      useAuthStore.setState({ initialTimezoneCheckDone: true });
    }

    // Only set isLoading to false after all initial async operations are complete
    useAuthStore.setState({ isLoading: false });
    console.log("[AuthStore] Initial auth setup complete. isLoading:", useAuthStore.getState().isLoading);

  } catch (error) {
    console.error("[AuthStore] Error during initial auth setup:", error);
    useAuthStore.setState({ isLoading: false }); // Ensure isLoading is false even on error.
  }
})();
