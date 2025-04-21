import {
  SlidersHorizontal,
  BarChartHorizontal,
  Target,
  Repeat,
  Filter,
  Music,
  BrainCircuit,
  Wind,
  Timer,
  SmilePlus,
  Shapes,
  Sparkles,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Calculator,
  CalendarClock,
  FileDown,
  Palette,
  Paintbrush,
  Image,
  Paintbrush2,
  Puzzle,
  MessagesSquare,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export interface PathReward {
  id: string; // Unique ID for the reward step (e.g., 'optimizer-1', 'sage-3')
  level: number; // 1-10
  sparkCost: number | null; // null for placeholder levels
  name: string;
  description: string; // Short description of the reward
  icon: LucideIcon;
  isPlaceholder: boolean;
}

export interface PathDefinition {
  id: string; // e.g., 'optimizer', 'sage'
  name: string;
  icon: LucideIcon;
  color: string; // Hex color
  description: string;
  rewards: PathReward[];
}

export const pathsConfig: PathDefinition[] = [
  // Path 1: The Optimizer
  {
    id: "optimizer",
    name: "The Optimizer",
    icon: SlidersHorizontal,
    color: "#3b82f6", // Blue
    description: "Enhance productivity tools and advanced planning.",
    rewards: [
      {
        id: "optimizer-1",
        level: 1,
        sparkCost: 100,
        name: "Pomodoro Stats",
        description: "Unlock weekly stats view for Pomodoro.",
        icon: BarChartHorizontal,
        isPlaceholder: false,
      },
      {
        id: "optimizer-2",
        level: 2,
        sparkCost: 250,
        name: "Goal Tracker",
        description: "Unlock the Goal Tracker widget.",
        icon: Target,
        isPlaceholder: false,
      },
      {
        id: "optimizer-3",
        level: 3,
        sparkCost: 500,
        name: "Recurring Tasks",
        description: "Enable recurring tasks in Todos.",
        icon: Repeat,
        isPlaceholder: false,
      },
      {
        id: "optimizer-4",
        level: 4,
        sparkCost: 800,
        name: "Advanced Todo Filtering",
        description: "Unlock advanced filtering/sorting for Todos.",
        icon: Filter,
        isPlaceholder: false,
      },
      {
        id: "optimizer-5",
        level: 5,
        sparkCost: 1200,
        name: "Custom Pomodoro Sounds",
        description: "Set custom sounds for Pomodoro work/break cycles.",
        icon: Music,
        isPlaceholder: false,
      },
      {
        id: "optimizer-6",
        level: 6,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "optimizer-7",
        level: 7,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "optimizer-8",
        level: 8,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "optimizer-9",
        level: 9,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "optimizer-10",
        level: 10,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
    ],
  },
  // Path 2: The Sage
  {
    id: "sage",
    name: "The Sage",
    icon: BrainCircuit,
    color: "#22c55e", // Green
    description: "Deeper wellness insights and advanced mindfulness tools.",
    rewards: [
      {
        id: "sage-1",
        level: 1,
        sparkCost: 100,
        name: "Nature Ambience Pack",
        description: "Unlock Wind and Bird sounds for Ambience.",
        icon: Wind,
        isPlaceholder: false,
      },
      {
        id: "sage-2",
        level: 2,
        sparkCost: 250,
        name: "Mindfulness Tracker",
        description: "Unlock the Mindfulness Minutes Tracker widget.",
        icon: Timer,
        isPlaceholder: false,
      },
      {
        id: "sage-3",
        level: 3,
        sparkCost: 500,
        name: "Journal Mood Tracking",
        description: "Upgrade Journaling with mood tracking & analysis.",
        icon: SmilePlus,
        isPlaceholder: false,
      },
      {
        id: "sage-4",
        level: 4,
        sparkCost: 800,
        name: "Custom Habit Icons",
        description: "Unlock additional icons for habits.",
        icon: Shapes,
        isPlaceholder: false,
      },
      {
        id: "sage-5",
        level: 5,
        sparkCost: 1200,
        name: "Personalized Affirmations",
        description: "Generate personalized affirmations.",
        icon: Sparkles,
        isPlaceholder: false,
      },
      {
        id: "sage-6",
        level: 6,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "sage-7",
        level: 7,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "sage-8",
        level: 8,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "sage-9",
        level: 9,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "sage-10",
        level: 10,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
    ],
  },
  // Path 3: The Forecaster
  {
    id: "forecaster",
    name: "The Forecaster",
    icon: TrendingUp,
    color: "#a855f7", // Purple
    description:
      "Advanced data analysis, financial planning, and trend spotting.",
    rewards: [
      {
        id: "forecaster-1",
        level: 1,
        sparkCost: 100,
        name: "Savings Goal Tracker",
        description: "Unlock the Savings Goal Tracker widget.",
        icon: PiggyBank,
        isPlaceholder: false,
      },
      {
        id: "forecaster-2",
        level: 2,
        sparkCost: 250,
        name: "Subscription Tracker",
        description: "Unlock the Subscription Tracker widget.",
        icon: CreditCard,
        isPlaceholder: false,
      },
      {
        id: "forecaster-3",
        level: 3,
        sparkCost: 500,
        name: "Debt Paydown Calculator",
        description: "Unlock the Debt Paydown Calculator widget.",
        icon: Calculator,
        isPlaceholder: false,
      },
      {
        id: "forecaster-4",
        level: 4,
        sparkCost: 800,
        name: "Recurring Finance Tracking",
        description: "Track recurring income and expenses.",
        icon: CalendarClock,
        isPlaceholder: false,
      },
      {
        id: "forecaster-5",
        level: 5,
        sparkCost: 1200,
        name: "Finance Data Export",
        description: "Export financial data to .csv.",
        icon: FileDown,
        isPlaceholder: false,
      },
      {
        id: "forecaster-6",
        level: 6,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "forecaster-7",
        level: 7,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "forecaster-8",
        level: 8,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "forecaster-9",
        level: 9,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "forecaster-10",
        level: 10,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
    ],
  },
  // Path 4: The Artisan
  {
    id: "artisan",
    name: "The Artisan",
    icon: Palette,
    color: "#f97316", // Orange
    description: "Personalization, Yuzu enhancements, and unique interactions.",
    rewards: [
      {
        id: "artisan-1",
        level: 1,
        sparkCost: 100,
        name: "Widget Theme: Minimalist",
        description: 'Unlock the "Minimalist" theme pack for widgets.',
        icon: Paintbrush,
        isPlaceholder: false,
      },
      {
        id: "artisan-2",
        level: 2,
        sparkCost: 250,
        name: "Custom Dashboard Background",
        description: "Set custom background images or colors.",
        icon: Image,
        isPlaceholder: false,
      },
      {
        id: "artisan-3",
        level: 3,
        sparkCost: 500,
        name: "Widget Theme: Neon",
        description: 'Unlock the "Neon" theme pack for widgets.',
        icon: Paintbrush2,
        isPlaceholder: false,
      },
      {
        id: "artisan-4",
        level: 4,
        sparkCost: 800,
        name: "Brain Teaser Widget",
        description: "Unlock the Brain Teaser/Puzzle widget.",
        icon: Puzzle,
        isPlaceholder: false,
      },
      {
        id: "artisan-5",
        level: 5,
        sparkCost: 1200,
        name: "Increase Yuzu Messages",
        description: "Increase the daily Yuzu message limit (Tier 1).",
        icon: MessagesSquare,
        isPlaceholder: false,
      },
      {
        id: "artisan-6",
        level: 6,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "artisan-7",
        level: 7,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "artisan-8",
        level: 8,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "artisan-9",
        level: 9,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
      {
        id: "artisan-10",
        level: 10,
        sparkCost: 999999999,
        name: "???",
        description: "Future enhancement.",
        icon: HelpCircle,
        isPlaceholder: true,
      },
    ],
  },
];

// Helper function to get a specific path definition
export const getPathById = (id: string): PathDefinition | undefined => {
  return pathsConfig.find((path) => path.id === id);
};

// Helper function to get a specific reward definition
export const getRewardById = (id: string): PathReward | undefined => {
  for (const path of pathsConfig) {
    const reward = path.rewards.find((r) => r.id === id);
    if (reward) {
      return reward;
    }
  }
  return undefined;
};
