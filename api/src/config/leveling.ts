export interface LevelThreshold {
  level: number;
  xpRequired: number;
}

// Example thresholds - adjust as needed for game balance
export const levelThresholds: LevelThreshold[] = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 1000 },
  { level: 6, xpRequired: 1750 },
  { level: 7, xpRequired: 2750 },
  { level: 8, xpRequired: 4000 },
  { level: 9, xpRequired: 5500 },
  { level: 10, xpRequired: 7500 },
  // Add more levels as needed
];

export function calculateLevel(totalXp: number): number {
  let currentLevel = 1;
  // Iterate backwards to find the highest level achieved
  for (let i = levelThresholds.length - 1; i >= 0; i--) {
    if (totalXp >= levelThresholds[i].xpRequired) {
      currentLevel = levelThresholds[i].level;
      break;
    }
  }
  return currentLevel;
}
