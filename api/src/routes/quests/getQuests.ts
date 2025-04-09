import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";

// Define types based on the schema in 0.2.1-quest-foundation.md
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
  type: string; // Keep as string for now, enum defined in DB
  config: Record<string, any> | null;
  target_count: number;
  current_progress: number;
  is_met: boolean;
  created_at: string;
  updated_at: string;
}

interface Quest {
  id: string;
  user_id: string;
  description: string;
  xp_reward: number;
  status: QuestStatus;
  type: QuestType;
  source: string; // Keep as string, enum defined in DB
  generated_at: string;
  activated_at: string | null;
  claimable_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  quest_criteria: QuestCriterion[]; // Embed criteria
}

export async function getQuests(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.user?.id;
  const supabase = req.supabase;
  const { status, type } = req.query; // Get optional query params

  if (!userId || !supabase) {
    res.status(401).json({ message: "Authentication required." });
    return;
  }

  try {
    let query = supabase
      .from("quests")
      .select(
        `
                *,
                quest_criteria (*)
            `
      )
      .eq("user_id", userId);

    // Apply filters based on query parameters
    if (status && typeof status === "string") {
      const validStatuses: QuestStatus[] = [
        "available",
        "active",
        "claimable",
        "completed",
        "cancelled",
      ];
      if (validStatuses.includes(status as QuestStatus)) {
        query = query.eq("status", status);
      } else {
        res.status(400).json({ message: "Invalid status filter value." });
        return;
      }
    }

    if (type && typeof type === "string") {
      const validTypes: QuestType[] = ["daily", "weekly"];
      if (validTypes.includes(type as QuestType)) {
        query = query.eq("type", type);
      } else {
        res.status(400).json({ message: "Invalid type filter value." });
        return;
      }
    }

    // Order by creation date or another relevant field if needed
    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching quests:", error);
      return next(new Error("Failed to fetch quests."));
    }

    res.status(200).json((data as Quest[]) ?? []); // Ensure array return
  } catch (error) {
    console.error("Unexpected error fetching quests:", error);
    next(error);
  }
}
