import React from "react";
import { useQuests, Quest } from "@/contexts/QuestsContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Check, Loader2, Info, Target, Star } from "lucide-react";

interface QuestsPanelProps {
  onClose: () => void;
}

const MAX_ACTIVE_DAILY_QUESTS = 2;
const MAX_ACTIVE_WEEKLY_QUESTS = 4;

export function QuestsPanel({ onClose }: QuestsPanelProps) {
  const {
    activeDailyQuests,
    activeWeeklyQuests,
    availableDailyQuests,
    availableWeeklyQuests,
    isLoading,
    activateQuest,
    cancelQuest,
    claimQuest,
  } = useQuests();

  const renderQuestCard = (quest: Quest, isActive: boolean) => {
    const isDaily = quest.type === "daily";
    const canActivate = isActive
      ? false
      : isDaily
      ? activeDailyQuests.length < MAX_ACTIVE_DAILY_QUESTS
      : activeWeeklyQuests.length < MAX_ACTIVE_WEEKLY_QUESTS;

    return (
      <Card key={quest.id} className="mb-4 bg-gray-700 border-gray-600">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-gray-100 flex items-center justify-between">
            {quest.description}
            <span className="text-sm font-normal text-yellow-400 flex items-center">
              <Star size={14} className="mr-1 fill-current" /> {quest.xp_reward}{" "}
              XP
            </span>
          </CardTitle>
          {quest.quest_criteria && quest.quest_criteria.length > 0 && (
            <CardDescription className="text-xs text-gray-400 pt-1">
              Criteria:{" "}
              {quest.quest_criteria.map((c) => c.description).join(", ")}
            </CardDescription>
          )}
        </CardHeader>
        <CardFooter className="pt-2 flex justify-end">
          {isActive ? (
            quest.status === "claimable" ? (
              <Button
                size="sm"
                variant="default" // Changed from "success" to "default"
                onClick={() => claimQuest(quest.id)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700" // Keep green style
              >
                <Check size={16} className="mr-1" /> Claim Reward
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelQuest(quest.id)}
                disabled={isLoading}
              >
                <X size={16} className="mr-1" /> Cancel
              </Button>
            )
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => activateQuest(quest.id)}
              disabled={isLoading || !canActivate}
              title={
                !canActivate
                  ? `Max active ${quest.type} quests reached`
                  : undefined
              }
            >
              <Target size={16} className="mr-1" /> Activate
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    activeQuests: Quest[],
    availableQuests: Quest[],
    limit: number
  ) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-200 border-b border-gray-600 pb-1">
        {title}
      </h3>
      <div className="mb-4">
        <h4 className="text-sm font-medium mb-2 text-gray-400">
          Active ({activeQuests.length}/{limit})
        </h4>
        {isLoading && activeQuests.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : activeQuests.length > 0 ? (
          activeQuests.map((quest) => renderQuestCard(quest, true))
        ) : (
          <p className="text-xs text-gray-500 italic px-2">
            No active {title.toLowerCase()}.
          </p>
        )}
      </div>
      <div>
        <h4 className="text-sm font-medium mb-2 text-gray-400">Available</h4>
        {isLoading && availableQuests.length === 0 ? (
          <div className="flex items-center justify-center p-4 text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : availableQuests.length > 0 ? (
          availableQuests.map((quest) => renderQuestCard(quest, false))
        ) : (
          <p className="text-xs text-gray-500 italic px-2">
            No available {title.toLowerCase()} to activate.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col text-gray-100">
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h2 className="text-xl font-semibold">Quests</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-100"
        >
          <X size={20} />
        </Button>
      </div>
      <ScrollArea className="flex-grow p-4">
        {renderSection(
          "Daily Quests",
          activeDailyQuests,
          availableDailyQuests,
          MAX_ACTIVE_DAILY_QUESTS
        )}
        {renderSection(
          "Weekly Quests",
          activeWeeklyQuests,
          availableWeeklyQuests,
          MAX_ACTIVE_WEEKLY_QUESTS
        )}
      </ScrollArea>
      {/* Optional Footer for info */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 flex items-center">
        <Info size={14} className="mr-1.5 flex-shrink-0" />
        <span>Activate available quests. Claim completed quests for XP.</span>
      </div>
    </div>
  );
}
