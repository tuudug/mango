import React, {
  createContext,
  useState,
  useContext,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { authenticatedFetch, ApiError } from "@/lib/apiClient";
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

interface QuestsContextType {
  quests: Quest[];
  activeDailyQuests: Quest[];
  activeWeeklyQuests: Quest[];
  availableDailyQuests: Quest[];
  availableWeeklyQuests: Quest[];
  isLoading: boolean;
  fetchQuests: () => Promise<void>;
  activateQuest: (questId: string) => Promise<Quest | null>;
  cancelQuest: (questId: string) => Promise<Quest | null>;
  claimQuest: (questId: string) => Promise<Quest | null>;
}

const QuestsContext = createContext<QuestsContextType | undefined>(undefined);

export const QuestsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { showToast } = useToast();
  const { session } = useAuth();

  const fetchQuests = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    try {
      const data = await authenticatedFetch<Quest[]>(
        "/api/quests",
        "GET",
        session
      );
      setQuests(data ?? []);
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
    } finally {
      setIsLoading(false);
    }
  }, [session, showToast]);

  useEffect(() => {
    if (session) {
      fetchQuests();
    } else {
      setQuests([]);
    }
  }, [session, fetchQuests]);

  const updateQuestInState = (updatedQuest: Quest) => {
    setQuests((prevQuests) =>
      prevQuests.map((q) => (q.id === updatedQuest.id ? updatedQuest : q))
    );
  };

  const activateQuest = useCallback(
    async (questId: string): Promise<Quest | null> => {
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
        console.error("Failed to activate quest:", error);
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
        console.error("Failed to cancel quest:", error);
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
      try {
        const updatedQuest = await authenticatedFetch<Quest>(
          `/api/quests/${questId}/claim`,
          "POST",
          session
        );
        if (updatedQuest) {
          updateQuestInState(updatedQuest);
          showToast({
            title: "Quest Claimed!",
            description: `+${updatedQuest.xp_reward} XP`,
            variant: "success",
          });
          console.log(
            "Auth context should update user XP/Level automatically via listener or next fetch."
          );
          return updatedQuest;
        }
        return null;
      } catch (error) {
        console.error("Failed to claim quest:", error);
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
    [session, showToast]
  );

  // Derived state - FIXED FILTERS
  const activeDailyQuests = quests.filter(
    (q) =>
      (q.status === "active" || q.status === "claimable") && q.type === "daily" // Include 'claimable'
  );
  const activeWeeklyQuests = quests.filter(
    (q) =>
      (q.status === "active" || q.status === "claimable") && q.type === "weekly" // Include 'claimable'
  );
  const availableDailyQuests = quests.filter(
    (q) => q.status === "available" && q.type === "daily"
  );
  const availableWeeklyQuests = quests.filter(
    (q) => q.status === "available" && q.type === "weekly"
  );

  const value = {
    quests,
    activeDailyQuests,
    activeWeeklyQuests,
    availableDailyQuests,
    availableWeeklyQuests,
    isLoading,
    fetchQuests,
    activateQuest,
    cancelQuest,
    claimQuest,
  };

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
