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
import { X, Check, Loader2, Info, Target, Star, RefreshCw } from "lucide-react"; // Added RefreshCw
import { isBefore, parseISO } from "date-fns"; // For date comparison

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
    generationState, // Get generation state
    isLoading,
    isGenerating, // Get generation loading state
    activateQuest,
    cancelQuest,
    claimQuest,
    generateOrResetQuests, // Get generation function
  } = useQuests();

  // --- Helper functions for button logic ---
  const canGenerateDaily = (): boolean => {
    if (!generationState) return true; // Allow initial generation if state unknown
    if (!generationState.lastDailyGeneratedAt) return true; // Allow if never generated

    // Check if last generation was before today (using local time for comparison)
    const lastGenDate = parseISO(generationState.lastDailyGeneratedAt); // Assumes ISO string from DB (UTC)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    return isBefore(lastGenDate, todayStart);
  };

  const canGenerateWeekly = (): boolean => {
    if (!generationState) return true; // Allow initial generation
    if (!generationState.lastWeeklyGeneratedAt) return true; // Allow if never generated

    // TODO: Replace with proper check against nextWeeklyResetAllowedAt when implemented
    // Simplified check: Allow if last generation was more than ~6 days ago
    const lastGenDate = parseISO(generationState.lastWeeklyGeneratedAt);
    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6); // Rough check

    return isBefore(lastGenDate, sixDaysAgo);
    // Proper check would be:
    // if (!generationState.nextWeeklyResetAllowedAt) return true; // Should ideally exist
    // return isBefore(new Date(), parseISO(generationState.nextWeeklyResetAllowedAt));
  };
  // --- End Helper functions ---

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
                variant="default"
                onClick={() => claimQuest(quest.id)}
                disabled={isLoading || isGenerating} // Disable during generation too
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Check size={16} className="mr-1" />
                )}{" "}
                Claim Reward
              </Button>
            ) : (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelQuest(quest.id)}
                disabled={isLoading || isGenerating} // Disable during generation too
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X size={16} className="mr-1" />
                )}{" "}
                Cancel
              </Button>
            )
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => activateQuest(quest.id)}
              disabled={isLoading || isGenerating || !canActivate} // Disable during generation too
              title={
                !canActivate
                  ? `Max active ${quest.type} quests reached`
                  : undefined
              }
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Target size={16} className="mr-1" />
              )}{" "}
              Activate
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  };

  const renderSection = (
    title: string,
    type: "daily" | "weekly", // Added type parameter
    activeQuests: Quest[],
    availableQuests: Quest[],
    limit: number
  ) => {
    const canGenerate =
      type === "daily" ? canGenerateDaily() : canGenerateWeekly();
    const hasGeneratedBefore =
      type === "daily"
        ? !!generationState?.lastDailyGeneratedAt
        : !!generationState?.lastWeeklyGeneratedAt;

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3 border-b border-gray-600 pb-1">
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          {/* Generation Button */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => generateOrResetQuests(type)}
            disabled={isGenerating || !canGenerate}
            title={
              !canGenerate
                ? `${
                    type.charAt(0).toUpperCase() + type.slice(1)
                  } quests not ready for reset yet.`
                : undefined
            }
            className="border-blue-500 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300"
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw size={14} className="mr-1.5" />
            )}
            {hasGeneratedBefore ? "Reset" : "Generate"} {type}
          </Button>
        </div>
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
              No available {title.toLowerCase()} to activate.{" "}
              {canGenerate && !isGenerating && (
                <button
                  onClick={() => generateOrResetQuests(type)}
                  className="text-blue-400 hover:underline focus:outline-none"
                >
                  Generate some?
                </button>
              )}
            </p>
          )}
        </div>
      </div>
    );
  };

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
          "daily", // Pass type
          activeDailyQuests,
          availableDailyQuests,
          MAX_ACTIVE_DAILY_QUESTS
        )}
        {renderSection(
          "Weekly Quests",
          "weekly", // Pass type
          activeWeeklyQuests,
          availableWeeklyQuests,
          MAX_ACTIVE_WEEKLY_QUESTS
        )}
      </ScrollArea>
      {/* Optional Footer for info */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500 flex items-center">
        <Info size={14} className="mr-1.5 flex-shrink-0" />
        <span>
          Activate available quests. Claim completed quests for XP. Generate new
          quests daily/weekly.
        </span>
      </div>
    </div>
  );
}
