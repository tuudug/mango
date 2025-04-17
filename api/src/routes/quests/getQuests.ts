import { NextFunction, Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  InternalServerError,
  AuthenticationError,
  BadRequestError,
  ValidationError, // Use for invalid query params
} from "../../utils/errors";

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
  const { status, type } = req.query;

  try {
    const userId = req.user?.id;
    const supabase = req.supabase;

    if (!userId || !supabase) {
      return next(new AuthenticationError("Authentication required."));
    }

    let query = supabase
      .from("quests")
      .select(
        `
        *,
        quest_criteria (*)
      `
      )
      .eq("user_id", userId);

    // Validate and apply filters
    if (status !== undefined) {
      if (typeof status !== "string") {
        return next(
          new ValidationError("Invalid status filter: must be a string.")
        );
      }
      const validStatuses: QuestStatus[] = [
        "available",
        "active",
        "claimable",
        "completed",
        "cancelled",
      ];
      if (!validStatuses.includes(status as QuestStatus)) {
        return next(
          new ValidationError(`Invalid status filter value: ${status}`)
        );
      }
      query = query.eq("status", status);
    }

    if (type !== undefined) {
      if (typeof type !== "string") {
        return next(
          new ValidationError("Invalid type filter: must be a string.")
        );
      }
      const validTypes: QuestType[] = ["daily", "weekly"];
      if (!validTypes.includes(type as QuestType)) {
        return next(new ValidationError(`Invalid type filter value: ${type}`));
      }
      query = query.eq("type", type);
    }

    query = query.order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Supabase error fetching quests:", error);
      return next(new InternalServerError("Failed to fetch quests."));
    }

    res.status(200).json((data as Quest[]) ?? []);
  } catch (error) {
    // Catch unexpected errors
    console.error("Unexpected error in getQuests handler:", error);
    next(error); // Pass to global error handler
  }
}
