import { SupabaseClient } from "@supabase/supabase-js";
import { calculateLevel } from "../config/leveling";
import { Database } from "../types/supabase"; // Assuming you have Supabase types generated

type UserProgress = Database["public"]["Tables"]["user_progress"]["Row"];

interface AwardXpResult {
  success: boolean;
  newXp?: number;
  newLevel?: number;
  levelUp: boolean;
  error?: string;
}

/**
 * Awards XP to a user, updates their progress, and calculates their new level.
 * @param userId The ID of the user to award XP to.
 * @param amount The amount of XP to award (must be positive integer).
 * @param supabase The Supabase client instance.
 * @returns An object indicating success, new XP/level, and if a level up occurred.
 */
export async function awardXpToUser(
  userId: string,
  amount: number,
  supabase: SupabaseClient<Database>
): Promise<AwardXpResult> {
  if (typeof amount !== "number" || !Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: "Invalid XP amount.", levelUp: false };
  }

  try {
    // Fetch current progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from("user_progress")
      .select("xp, level")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching user progress in service:", fetchError);
      return {
        success: false,
        error: "Failed to fetch user progress.",
        levelUp: false,
      };
    }

    const currentXp = currentProgress?.xp ?? 0;
    const currentLevel = currentProgress?.level ?? 1;

    const newXp = currentXp + amount;
    const newLevel = calculateLevel(newXp);
    const levelUp = newLevel > currentLevel;

    // Upsert new progress
    const { error: updateError } = await supabase.from("user_progress").upsert(
      {
        user_id: userId,
        xp: newXp,
        level: newLevel,
      },
      { onConflict: "user_id" }
    );

    if (updateError) {
      console.error("Error updating user progress in service:", updateError);
      return {
        success: false,
        error: "Failed to update user progress.",
        levelUp: false,
      };
    }

    return { success: true, newXp, newLevel, levelUp };
  } catch (error) {
    console.error("Unexpected error awarding XP in service:", error);
    return {
      success: false,
      error: "An unexpected error occurred while awarding XP.",
      levelUp: false,
    };
  }
}
