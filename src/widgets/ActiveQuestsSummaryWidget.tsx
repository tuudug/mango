import { useQuests } from "@/contexts/QuestsContext";

interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

export function ActiveQuestsSummaryWidget({ w }: WidgetProps) {
  const { activeDailyQuests, activeWeeklyQuests } = useQuests();

  const activeCount = activeDailyQuests.length + activeWeeklyQuests.length;
  const maxCount = 6; // 2 daily + 4 weekly

  const isMini = w < 4;

  return (
    <div className="h-full flex flex-col items-center justify-center p-2 text-gray-100">
      <div className="text-sm font-semibold mb-1">Active Quests</div>
      <div className="text-lg font-bold text-yellow-400 mb-1">
        {activeCount} / {maxCount}
      </div>
      {!isMini && (
        <div className="flex flex-col items-center space-y-1 text-xs text-gray-300">
          {activeDailyQuests.slice(0, 3).map((q) => (
            <div key={q.id} className="truncate max-w-[120px]">
              🗓️ {q.description}
            </div>
          ))}
          {activeWeeklyQuests.slice(0, 3).map((q) => (
            <div key={q.id} className="truncate max-w-[120px]">
              📅 {q.description}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
