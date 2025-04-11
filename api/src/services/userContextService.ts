import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Fetches and summarizes the user's context from all major data sources.
 * Returns a string with XML-like tags for use in LLM prompts.
 */
export async function getUserContextSummary(
  userId: string,
  supabase: SupabaseClient
): Promise<string> {
  // Progress: Level and XP
  let progressStr = "N/A";
  try {
    const { data, error } = await supabase
      .from("user_progress")
      .select("level, xp, xp_needed_for_next_level")
      .eq("user_id", userId)
      .single();
    if (!error && data) {
      progressStr = `Level: ${data.level}, XP: ${data.xp}/${data.xp_needed_for_next_level}`;
    }
  } catch {}

  // Quests: Active/claimable daily/weekly
  let questsStr = "N/A";
  try {
    const { data, error } = await supabase
      .from("quests")
      .select("status, type")
      .eq("user_id", userId);
    if (!error && data) {
      const activeDaily = data.filter(
        (q: any) => q.status === "active" && q.type === "daily"
      ).length;
      const activeWeekly = data.filter(
        (q: any) => q.status === "active" && q.type === "weekly"
      ).length;
      const claimableDaily = data.filter(
        (q: any) => q.status === "claimable" && q.type === "daily"
      ).length;
      const claimableWeekly = data.filter(
        (q: any) => q.status === "claimable" && q.type === "weekly"
      ).length;
      questsStr = `Active: ${activeDaily} Daily, ${activeWeekly} Weekly. Claimable: ${claimableDaily} Daily, ${claimableWeekly} Weekly.`;
    }
  } catch {}

  // Todos: Pending count
  let todosStr = "N/A";
  try {
    const { count, error } = await supabase
      .from("todos")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_completed", false);
    if (!error && typeof count === "number") {
      todosStr = `Pending: ${count}`;
    }
  } catch {}

  // Habits: List all habits with today's status
  let habitsStr = "N/A";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: habits, error: habitsError } = await supabase
      .from("manual_habits")
      .select("id, name, type")
      .eq("user_id", userId);
    if (!habitsError && habits && habits.length > 0) {
      const { data: entries, error: entriesError } = await supabase
        .from("manual_habit_entries")
        .select("habit_id, completed")
        .eq("user_id", userId)
        .eq("entry_date", today);
      if (!entriesError && entries) {
        // Map: habitId -> completed
        const entryMap = new Map<string, boolean>();
        for (const entry of entries) {
          entryMap.set(String(entry.habit_id), !!entry.completed);
        }
        const pos = habits.filter((h: any) => h.type === "positive");
        const neg = habits.filter((h: any) => h.type === "negative");

        const posList = pos.map((h: any) => {
          const done = entryMap.get(String(h.id));
          return `${h.name} (${done ? "Done" : "Pending"})`;
        });
        const negList = neg.map((h: any) => {
          const done = entryMap.get(String(h.id));
          // For negative: "Done" means avoided (no entry), "Failed" means completed entry exists
          return `${h.name} (${done ? "Failed" : "Done"})`;
        });

        let lines: string[] = [];
        if (posList.length > 0) lines.push(`Positive: ${posList.join(", ")}`);
        if (negList.length > 0) lines.push(`Negative: ${negList.join(", ")}`);
        habitsStr = lines.join(". ");
      }
    }
  } catch {}

  // Health: Steps today vs. goal
  let healthStr = "N/A";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: settings, error: settingsError } = await supabase
      .from("manual_health_settings")
      .select("daily_steps_goal")
      .eq("user_id", userId)
      .single();
    const { data: entries, error: entriesError } = await supabase
      .from("manual_health_entries")
      .select("steps")
      .eq("user_id", userId)
      .eq("entry_date", today);
    if (!settingsError && settings && !entriesError && entries) {
      const steps = entries.reduce(
        (sum: number, e: any) => sum + (e.steps || 0),
        0
      );
      const goal = settings.daily_steps_goal || 10000;
      healthStr = `Steps: ${steps} / ${goal} goal.`;
    }
  } catch {}

  // Finance: Today's spending vs. allowance
  let financeStr = "N/A";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { data: settings, error: settingsError } = await supabase
      .from("manual_finance_settings")
      .select("daily_allowance_goal, currency")
      .eq("user_id", userId)
      .single();
    const { data: entries, error: entriesError } = await supabase
      .from("manual_finance_entries")
      .select("amount")
      .eq("user_id", userId)
      .eq("entry_date", today);
    if (!settingsError && settings && !entriesError && entries) {
      const spent = entries.reduce(
        (sum: number, e: any) => sum + (e.amount || 0),
        0
      );
      const allowance = settings.daily_allowance_goal || 0;
      const currency = settings.currency || "$";
      financeStr = `Spending: ${currency}${spent.toFixed(
        2
      )} / ${currency}${allowance.toFixed(2)} allowance.`;
    }
  } catch {}

  // Calendar: Events remaining today
  let calendarStr = "N/A";
  try {
    const today = new Date().toISOString().slice(0, 10);
    const { count, error } = await supabase
      .from("calendar_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("date", today)
      .gte("end_time", new Date().toISOString());
    if (!error && typeof count === "number") {
      calendarStr = `Events Today: ${count} remaining.`;
    }
  } catch {}

  // Compose context string
  return `
<user_context>
  <progress>${progressStr}</progress>
  <quests>${questsStr}</quests>
  <todos>${todosStr}</todos>
  <habits>${habitsStr}</habits>
  <health>${healthStr}</health>
  <finance>${financeStr}</finance>
  <calendar>${calendarStr}</calendar>
</user_context>
  `.trim();
}
