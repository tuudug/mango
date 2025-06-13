import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"; // Assuming Dialog components exist
import { Play, Pause, Info, Volume2, VolumeX } from "lucide-react"; // Add volume icons
import { useAmbienceStore } from "@/stores/ambienceStore"; // Import from Zustand store
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion"; // Import motion and AnimatePresence

// Define common props for widget components
interface WidgetProps {
  id: string;
  w: number; // Add width
  h: number; // Add height
}

// Update attribution text
const ATTRIBUTION_TEXT = "Audio source: https://ambiph.one/";

// Prefix unused props with underscore
export function AmbienceWidget({ id: _id, w: _w, h: _h }: WidgetProps) {
  const {
    playbackState,
    togglePlayback,
    volume,
    setVolume,
    isAudioReady,
    initAudio,
  } = useAmbienceStore();
  const [isAttributionModalOpen, setIsAttributionModalOpen] = useState(false);

  // Attempt to initialize audio if not ready (e.g. if auto-init failed due to browser policy)
  useEffect(() => {
    if (!isAudioReady) {
      initAudio().catch((e) =>
        console.warn("Error explicitly initializing audio from widget:", e)
      );
    }
  }, [isAudioReady, initAudio]);

  const isPlaying = playbackState === "playing";
  const buttonIcon = isPlaying ? <Pause size={24} /> : <Play size={24} />;

  // Handle volume change from slider
  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  // Generate raindrop properties once using useMemo to prevent recalculation on every render
  const raindrops = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`, // Random horizontal position
      duration: Math.random() * 1 + 0.5, // Random duration between 0.5s and 1.5s
      delay: Math.random() * 2, // Random delay up to 2s
    }));
  }, []); // Empty dependency array means this runs only once

  return (
    // Main container needs to allow overflow for animation visibility
    <div className="p-4 h-full flex flex-col items-center justify-center text-center relative">
      {/* Raindrop Container - Positioned behind content, use z-0 */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatePresence>
          {isPlaying &&
            raindrops.map((drop) => (
              <motion.div
                key={drop.id}
                className="absolute w-0.5 h-4 bg-blue-300/50 rounded-full" // Style the raindrop
                style={{ left: drop.left }}
                initial={{ y: "-10%", opacity: 0 }} // Start above and invisible
                animate={{ y: "110%", opacity: 1 }} // Fall down and fade in
                exit={{ opacity: 0 }} // Fade out on exit
                transition={{
                  duration: drop.duration,
                  delay: drop.delay,
                  repeat: Infinity,
                  repeatType: "loop",
                  ease: "linear", // Constant falling speed
                }}
              />
            ))}
        </AnimatePresence>
      </div>

      {/* Main Content - Positioned above raindrops */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        {/* Badge with Info Button */}
        <div className="inline-flex items-center bg-gray-700 text-gray-200 text-xs font-medium px-2.5 py-0.5 rounded-full mb-4">
          <span>Rain</span>
          <Dialog
            open={isAttributionModalOpen}
            onOpenChange={setIsAttributionModalOpen}
          >
            {/* We use a Button as the trigger, but control open state */}
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 ml-1.5 p-0 text-gray-400 hover:text-gray-100"
              onClick={() => setIsAttributionModalOpen(true)}
              aria-label="Show attribution"
            >
              <Info size={12} />
            </Button>
            <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700 text-gray-100">
              <DialogHeader>
                <DialogTitle>Audio Attribution</DialogTitle>
              </DialogHeader>
              <DialogDescription className="py-4 text-sm text-gray-300">
                {/* Display updated attribution text */}
                {ATTRIBUTION_TEXT}
              </DialogDescription>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary">
                    Close
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Play/Pause Button */}
        <Button
          onClick={togglePlayback}
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full h-16 w-16 border-2 mb-4", // Added margin bottom
            isPlaying
              ? "border-blue-500 text-blue-400 bg-blue-900/30 hover:bg-blue-800/40"
              : "border-gray-600 text-gray-400 bg-gray-700/50 hover:bg-gray-700"
          )}
          aria-label={isPlaying ? "Pause rain sound" : "Play rain sound"}
        >
          {buttonIcon}
        </Button>

        {/* Volume Slider */}
        <div className="flex items-center gap-2 w-full max-w-[150px]">
          <VolumeX size={16} className="text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
            aria-label="Volume control"
          />
          <Volume2 size={16} className="text-gray-400" />
        </div>
      </div>
    </div>
  );
}
