import { ApiError, authenticatedFetch } from "@/lib/apiClient";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef, // Keep useRef
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "./ToastContext";

// --- Types ---
type QuestStatus =
  | "available"
  | "active"
  | "claimable"
  | "completed"
  | "cancelled";
type QuestType = "daily" | "weekly";

interface QuestCriterion {
  id: string;
  quest_id: string;
  description: string;
  type: string;
  config: Record<string, any> | null;
  target_count: number;
  current_progress: number;
  is_met: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  user_id: string;
  description: string;
  xp_reward: number;
  status: QuestStatus;
  type: QuestType;
  source: string;
  generated_at: string;
  activated_at: string | null;
  claimable_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  quest_criteria: QuestCriterion[];
}

// Added type for generation state
interface QuestGenerationState {
  lastDailyGeneratedAt: string | null;
  lastWeeklyGeneratedAt: string | null;
  nextWeeklyResetAllowedAt: string | null; // Store as ISO string
}

// Added type for generation API response
interface GenerateQuestsResponse {
  success: boolean;
  message: string;
  generatedQuests?: Quest[];
}

interface QuestsContextType {
  quests: Quest[];
  activeDailyQuests: Quest[];
  activeWeeklyQuests: Quest[];
  availableDailyQuests: Quest[];
  availableWeeklyQuests: Quest[];
  generationState: QuestGenerationState | null; // Added state
  isLoading: boolean;
  isGenerating: boolean; // Added loading state for generation
  // Update fetchQuests signature to accept optional options
  fetchQuests: (options?: { forceRefresh?: boolean }) => Promise<void>;
  activateQuest: (questId: string) => Promise<Quest | null>;
  cancelQuest: (questId: string) => Promise<Quest | null>;
  claimQuest: (questId: string) => Promise<Quest | null>;
  generateOrResetQuests: (type: QuestType) => Promise<void>; // Added function
}

const QuestsContext = createContext<QuestsContextType | undefined>(undefined);

export const QuestsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false); // Added state
  // Re-add the missing useState for generationState
  const [generationState, setGenerationState] =
    useState<QuestGenerationState | null>(null);
  // Removed lastFetchTimestampRef
  const { showToast } = useToast();
  const { session, fetchUserProgress } = useAuth(); // Get fetchUserProgress from AuthContext
  const initialFetchDoneRef = useRef(false); // Ref to track initial fetch

  // Fetch quests and potentially generation state
  const fetchQuests = useCallback(
    async (_options: { forceRefresh?: boolean } = {}) => {
      // Removed forceRefresh option and cooldown logic
      if (!session) return;

      console.log(`[QuestsContext] Fetching quests...`); // Prefixed log
      setIsLoading(true);
      try {
        // TODO: Modify backend GET /api/quests to optionally include generationState
        // For now, fetch quests only. Generation state might need a separate fetch or endpoint.
        const data = await authenticatedFetch<Quest[]>(
          "/api/quests",
          "GET",
          session
        );
        setQuests(data ?? []);
        // Removed timestamp update

        // Placeholder: Fetch generation state separately if needed
        // const genState = await authenticatedFetch<QuestGenerationState>('/api/quests/generation-state', 'GET', session);
        // setGenerationState(genState);
      } catch (error) {
        console.error("Failed to fetch quests:", error);
        showToast({
          title: "Error Fetching Quests",
          description:
            error instanceof ApiError
              ? error.message
              : "An unknown error occurred",
          variant: "destructive",
        });
        setQuests([]);
        setGenerationState(null); // Reset on error
      } finally {
        setIsLoading(false);
      }
    },
    [session, showToast]
  ); // Keep dependencies minimal for the core fetch logic

  // Initial fetch on session change - only fetch once
  useEffect(() => {
    if (session && !initialFetchDoneRef.current) {
      console.log(
        "[QuestsContext] Session detected for the first time, fetching initial quests..."
      ); // Prefixed log
      initialFetchDoneRef.current = true; // Mark initial fetch as done
      fetchQuests({ forceRefresh: true }); // Force refresh on initial load/login
    } else if (!session) {
      setQuests([]);
      setGenerationState(null); // Clear state on logout
      // Removed timestamp reset
      initialFetchDoneRef.current = false; // Reset flag
    }
  }, [session, fetchQuests]); // fetchQuests dependency is okay here

  // Removed window focus useEffect hook

  const updateQuestInState = (updatedQuest: Quest) => {
    setQuests((prevQuests) =>
      prevQuests.map((q) => (q.id === updatedQuest.id ? updatedQuest : q))
    );
  };

  const activateQuest = useCallback(
    async (questId: string): Promise<Quest | null> => {
      // ... (implementation remains the same)
      if (!session) return null;
      setIsLoading(true);
      try {
        const updatedQuest = await authenticatedFetch<Quest>(
          `/api/quests/${questId}/activate`,
          "POST",
          session
        );
        if (updatedQuest) {
          updateQuestInState(updatedQuest);
          showToast({ title: "Quest Activated!", variant: "success" });
          return updatedQuest;
        }
        return null;
      } catch (error) {
        console.error("[QuestsContext] Failed to activate quest:", error); // Prefixed log
        showToast({
          title: "Error Activating Quest",
          description:
            error instanceof ApiError
              ? error.message
              : "Could not activate quest.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session, showToast]
  );

  const cancelQuest = useCallback(
    async (questId: string): Promise<Quest | null> => {
      // ... (implementation remains the same)
      if (!session) return null;
      setIsLoading(true);
      try {
        const updatedQuest = await authenticatedFetch<Quest>(
          `/api/quests/${questId}/cancel`,
          "POST",
          session
        );
        if (updatedQuest) {
          updateQuestInState(updatedQuest);
          showToast({ title: "Quest Cancelled", variant: "info" });
          return updatedQuest;
        }
        return null;
      } catch (error) {
        console.error("[QuestsContext] Failed to cancel quest:", error); // Prefixed log
        showToast({
          title: "Error Cancelling Quest",
          description:
            error instanceof ApiError
              ? error.message
              : "Could not cancel quest.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session, showToast]
  );

  const claimQuest = useCallback(
    async (questId: string): Promise<Quest | null> => {
      if (!session) return null;
      setIsLoading(true);
      //let claimedQuest: Quest | null = null;
      try {
        const updatedQuest = await authenticatedFetch<Quest>(
          `/api/quests/${questId}/claim`,
          "POST",
          session
        );
        if (updatedQuest) {
          //claimedQuest = updatedQuest; // Store for XP update
          updateQuestInState(updatedQuest);
          showToast({
            title: "Quest Claimed!",
            description: `+${updatedQuest.xp_reward} XP`,
            variant: "success",
          });
          // Trigger user progress refresh in AuthContext
          await fetchUserProgress(); // Await the refresh
          return updatedQuest;
        }
        return null;
      } catch (error) {
        console.error("[QuestsContext] Failed to claim quest:", error); // Prefixed log
        showToast({
          title: "Error Claiming Quest",
          description:
            error instanceof ApiError
              ? error.message
              : "Could not claim quest.",
          variant: "destructive",
        });
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [session, showToast, fetchUserProgress] // Add fetchUserProgress dependency
  );

  // Function to generate or reset quests
  const generateOrResetQuests = useCallback(
    async (type: QuestType) => {
      if (!session) return;
      setIsGenerating(true);
      try {
        const response = await authenticatedFetch<GenerateQuestsResponse>(
          "/api/quests/generate",
          "POST",
          session,
          { type } // Send type in the body
        );

        if (response.success) {
          showToast({
            title: `${
              type.charAt(0).toUpperCase() + type.slice(1)
            } Quests Generated!`,
            description: response.message,
            variant: "success",
          });
          // Refresh the quest list to show newly generated quests, forcing it
          await fetchQuests({ forceRefresh: true });
          // TODO: Update generationState based on response or refetch
        } else {
          // API handled the error message generation
          showToast({
            title: `Generate ${type} Quests Failed`,
            description: response.message,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error(
          `[QuestsContext] Failed to generate ${type} quests:`,
          error
        ); // Prefixed log
        showToast({
          title: `Generate ${type} Quests Error`,
          description:
            error instanceof ApiError
              ? error.message
              : `Could not generate ${type} quests.`,
          variant: "destructive",
        });
      } finally {
        setIsGenerating(false);
      }
    },
    [session, showToast, fetchQuests] // Add fetchQuests dependency
  );

  // Derived state - FIXED FILTERS
  const activeDailyQuests = useMemo(
    () =>
      quests.filter(
        (q) =>
          (q.status === "active" || q.status === "claimable") &&
          q.type === "daily"
      ),
    [quests]
  );
  const activeWeeklyQuests = useMemo(
    () =>
      quests.filter(
        (q) =>
          (q.status === "active" || q.status === "claimable") &&
          q.type === "weekly"
      ),
    [quests]
  );
  const availableDailyQuests = useMemo(
    () => quests.filter((q) => q.status === "available" && q.type === "daily"),
    [quests]
  );
  const availableWeeklyQuests = useMemo(
    () => quests.filter((q) => q.status === "available" && q.type === "weekly"),
    [quests]
  );

  const value = useMemo(
    () => ({
      quests,
      activeDailyQuests,
      activeWeeklyQuests,
      availableDailyQuests,
      availableWeeklyQuests,
      generationState, // Added
      isLoading,
      isGenerating, // Added
      fetchQuests,
      activateQuest,
      cancelQuest,
      claimQuest,
      generateOrResetQuests, // Added
    }),
    [
      quests,
      activeDailyQuests,
      activeWeeklyQuests,
      availableDailyQuests,
      availableWeeklyQuests,
      generationState,
      isLoading,
      isGenerating,
      fetchQuests,
      activateQuest,
      cancelQuest,
      claimQuest,
      generateOrResetQuests,
    ] // Add new state/functions
  );

  return (
    <QuestsContext.Provider value={value}>{children}</QuestsContext.Provider>
  );
};

export const useQuests = (): QuestsContextType => {
  const context = useContext(QuestsContext);
  if (context === undefined) {
    throw new Error("useQuests must be used within a QuestsProvider");
  }
  return context;
};
