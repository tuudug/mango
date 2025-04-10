import { Badge } from "@/components/ui/badge"; // Import Badge
import { Button } from "@/components/ui/button";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Quest, useQuests } from "@/contexts/QuestsContext";
import {
  addDays,
  addHours,
  formatDistanceToNow,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns"; // Import date functions
import { motion } from "framer-motion"; // Import motion
import {
  Check,
  Clock,
  Info,
  Loader2,
  RefreshCw,
  Star,
  Target,
  X,
} from "lucide-react"; // Added RefreshCw, Clock

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

  // Animation variants
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  };

  const renderQuestCard = (quest: Quest, isActive: boolean) => {
    const isDaily = quest.type === "daily";
    const canActivate = isActive
      ? false
      : isDaily
      ? activeDailyQuests.length < MAX_ACTIVE_DAILY_QUESTS
      : activeWeeklyQuests.length < MAX_ACTIVE_WEEKLY_QUESTS;

    // --- Expiry Calculation ---
    let expiryDate: Date | null = null;
    let isExpired = false;
    let timeRemaining: string | null = null;

    if (isActive && quest.activated_at) {
      const activationDate = parseISO(quest.activated_at);
      if (quest.type === "daily") {
        expiryDate = addHours(activationDate, 24);
      } else if (quest.type === "weekly") {
        expiryDate = addDays(activationDate, 7);
      }

      if (expiryDate) {
        isExpired = isAfter(new Date(), expiryDate);
        if (!isExpired) {
          timeRemaining = formatDistanceToNow(expiryDate, { addSuffix: true });
        }
      }
    }
    // --- End Expiry Calculation ---

    return (
      // Wrap Card with motion.div
      <motion.div
        key={quest.id} // Key must be on the motion component
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        layout // Animate layout changes
        className="mb-4" // Move margin bottom here
      >
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-gray-100 flex items-center justify-between gap-2">
              <span className="flex-1">{quest.description}</span>{" "}
              {/* Allow title to wrap */}
              <div className="flex items-center flex-shrink-0 space-x-2">
                {" "}
                {/* Group badges/XP */}
                {/* Display Time Remaining or Expired Badge */}
                {isActive && isExpired && (
                  <Badge variant="destructive" className="text-xs">
                    Expired
                  </Badge>
                )}
                {isActive && !isExpired && timeRemaining && (
                  <Badge
                    variant="outline"
                    className="text-xs text-gray-400 border-gray-600 font-normal"
                  >
                    <Clock size={12} className="mr-1" />{" "}
                    {timeRemaining.replace("about ", "")}
                  </Badge>
                )}
                <span className="text-sm font-normal text-yellow-400 flex items-center">
                  <Star size={14} className="mr-1 fill-current" />{" "}
                  {quest.xp_reward} XP
                </span>
              </div>
            </CardTitle>
            {/* Render Criteria with Progress */}
            {quest.quest_criteria && quest.quest_criteria.length > 0 && (
              <div className="pt-2 text-xs text-gray-400 space-y-1">
                {quest.quest_criteria.map((c) => (
                  <div
                    key={c.id}
                    className={`flex items-center ${
                      c.is_met ? "line-through text-gray-500" : ""
                    }`}
                  >
                    <span className="mr-2">-</span>
                    <span>{c.description}</span>
                    {!c.is_met && c.target_count > 1 && (
                      <span className="ml-1.5 text-gray-500">
                        ({c.current_progress}/{c.target_count})
                      </span>
                    )}
                    {c.is_met && (
                      <Check
                        size={12}
                        className="ml-1.5 text-green-500 flex-shrink-0"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardHeader>
          {/* Footer remains below the criteria list */}
          <CardFooter className="pt-3 flex justify-end">
            {/* Conditional Button Rendering based on expiry */}
            {isActive && isExpired ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => cancelQuest(quest.id)}
                disabled={isLoading || isGenerating}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <X size={16} className="mr-1" />
                )}{" "}
                Cancel {/* Or "Remove Expired" */}
              </Button>
            ) : isActive ? ( // Not expired, show normal buttons
              quest.status === "claimable" ? (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => claimQuest(quest.id)}
                  disabled={isLoading || isGenerating}
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
                  disabled={isLoading || isGenerating}
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
                disabled={isLoading || isGenerating || !canActivate}
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
      </motion.div>
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
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateOrResetQuests("daily")}
                  disabled={isGenerating || !canGenerateDaily()}
                  className="border-blue-500 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw size={14} className="mr-1.5" />
                  )}
                  Daily
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Generate Daily Quests
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => generateOrResetQuests("weekly")}
                  disabled={isGenerating || !canGenerateWeekly()}
                  className="border-blue-500 text-blue-400 hover:bg-blue-900/50 hover:text-blue-300"
                >
                  {isGenerating ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw size={14} className="mr-1.5" />
                  )}
                  Weekly
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Generate Weekly Quests
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-100"
          >
            <X size={20} />
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-grow p-3 space-y-6 pb-24">
        {renderSection(
          "Daily Quests",
          "daily",
          activeDailyQuests,
          availableDailyQuests,
          MAX_ACTIVE_DAILY_QUESTS
        )}
        {renderSection(
          "Weekly Quests",
          "weekly",
          activeWeeklyQuests,
          availableWeeklyQuests,
          MAX_ACTIVE_WEEKLY_QUESTS
        )}
      </ScrollArea>
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
