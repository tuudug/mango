import React, { useState, useCallback } from "react";
// Removed: import { Button } from "@/components/ui/button";
// Removed: import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils"; // Import cn

// Define common props for widget components
interface WidgetProps {
  id: string;
  w: number;
  h: number;
}

const affirmations = [
  "I am capable of achieving great things.",
  "I embrace challenges as opportunities for growth.",
  "I radiate positivity and attract good things into my life.",
  "I am worthy of love, happiness, and success.",
  "I trust my intuition and make wise decisions.",
  "I am resilient and can overcome any obstacle.",
  "I am grateful for the abundance in my life.",
  "I choose peace and calm in every situation.",
  "I am confident in my abilities.",
  "Today is a new opportunity to shine.",
  "I release negativity and welcome positivity.",
  "I am enough, just as I am.",
];

// Helper function to get a random item from an array
const getRandomItem = <T,>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// Prefix unused props with underscore
export function AffirmationWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const [currentAffirmation, setCurrentAffirmation] = useState<string>(() =>
    getRandomItem(affirmations)
  );

  const changeAffirmation = useCallback(() => {
    let nextAffirmation = getRandomItem(affirmations);
    // Ensure the next one is different if possible (only if list > 1)
    if (affirmations.length > 1) {
      while (nextAffirmation === currentAffirmation) {
        nextAffirmation = getRandomItem(affirmations);
      }
    }
    setCurrentAffirmation(nextAffirmation);
  }, [currentAffirmation]);

  return (
    <div className="p-4 h-full flex flex-col items-center justify-center text-center">
      {/* Make the paragraph clickable and apply gradient - Removed flex-grow, flex, items-center */}
      <p
        className={cn(
          "text-lg font-medium cursor-pointer transition-opacity duration-150 hover:opacity-80", // Base styles + hover effect
          "bg-gradient-to-r from-yellow-400 via-amber-500 to-yellow-600", // Gradient colors
          "bg-clip-text text-transparent" // Apply gradient to text
        )}
        onClick={changeAffirmation}
        title="Click for next affirmation" // Add tooltip
      >
        {/* Use HTML entities for quotes */}
        &ldquo;{currentAffirmation}&rdquo;
      </p>
      {/* Removed Button */}
    </div>
  );
}
