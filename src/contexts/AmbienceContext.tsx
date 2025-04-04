import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useRef,
  useCallback,
  useEffect,
} from "react";

export type PlaybackState = "playing" | "paused" | "stopped";

interface AmbienceContextType {
  playbackState: PlaybackState;
  togglePlayback: () => void;
  volume: number; // Add volume state
  setVolume: (volume: number) => void; // Add volume setter
}

const AmbienceContext = createContext<AmbienceContextType | undefined>(
  undefined
);

// Update audio source path
const AUDIO_SRC = "/audio/rain.flac";

export const AmbienceProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("stopped");
  const [volume, setInternalVolume] = useState<number>(0.5);
  const [isAudioReady, setIsAudioReady] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  // Ref to store the start time offset when pausing
  // const pauseStartTimeRef = useRef<number>(0); // Not strictly needed for simple suspend/resume

  // --- Initialize Audio Context and Load Buffer ---
  useEffect(() => {
    if (!audioContextRef.current) {
      console.log("Creating AudioContext");
      // Check if context exists before trying to create - safety for StrictMode double invoke
      if (!window.AudioContext) {
        console.error("Web Audio API not supported in this browser.");
        return;
      }
      try {
        audioContextRef.current = new window.AudioContext();
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = volume;
        gainNodeRef.current.connect(audioContextRef.current.destination);
      } catch (e) {
        console.error("Error creating AudioContext:", e);
        return;
      }
    }

    let isCancelled = false;
    const loadAudio = async () => {
      // Reset buffer and ready state if source changes (though it doesn't here)
      audioBufferRef.current = null;
      setIsAudioReady(false);
      if (!audioContextRef.current) return;

      console.log("Fetching audio data from:", AUDIO_SRC);
      try {
        const response = await fetch(AUDIO_SRC);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        console.log(
          `Decoding audio data (${(
            arrayBuffer.byteLength /
            1024 /
            1024
          ).toFixed(2)} MB)...`
        );
        // Add extra catch specifically for decodeAudioData
        await audioContextRef.current
          .decodeAudioData(arrayBuffer)
          .then((decodedBuffer) => {
            if (!isCancelled) {
              console.log("Audio data decoded and ready.");
              audioBufferRef.current = decodedBuffer;
              setIsAudioReady(true);
            }
          })
          .catch((decodeError) => {
            console.error("Error decoding audio data:", decodeError);
            if (!isCancelled) setIsAudioReady(false);
          });
      } catch (error) {
        console.error("Error loading audio file:", error);
        if (!isCancelled) setIsAudioReady(false);
      }
    };
    loadAudio();

    return () => {
      isCancelled = true;
      // Stop source node if it exists on unmount
      if (sourceNodeRef.current) {
        try {
          sourceNodeRef.current.stop();
        } catch (e) {
          // Explicitly ignore error if already stopped or node is invalid
        }
        sourceNodeRef.current.disconnect();
        sourceNodeRef.current = null;
      }
      // Close context only if provider truly unmounts (might cause issues if reused)
      // if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      //   console.log("Closing AudioContext");
      //   audioContextRef.current.close();
      //   audioContextRef.current = null;
      // }
    };
  }, []); // Effect should only run once

  // --- Playback Control using suspend/resume ---
  const play = useCallback(async () => {
    // Make async to await resume
    if (
      !audioContextRef.current ||
      !audioBufferRef.current ||
      !gainNodeRef.current ||
      !isAudioReady
    ) {
      console.warn("Play called but audio not ready or context missing.", {
        isAudioReady,
        audioBuffer: !!audioBufferRef.current,
        context: !!audioContextRef.current,
      });
      return;
    }

    try {
      // ALWAYS try resuming context first, in case it was suspended by browser
      if (audioContextRef.current.state === "suspended") {
        console.log("Resuming AudioContext before play/start...");
        await audioContextRef.current.resume(); // Await resume
      }

      // If stopped (or paused and source was lost), create and start a new source node
      if (
        !sourceNodeRef.current ||
        playbackState === "stopped" ||
        playbackState === "paused"
      ) {
        // Ensure no old source is lingering
        if (sourceNodeRef.current) {
          try {
            sourceNodeRef.current.stop();
          } catch (e) {
            // Explicitly ignore error if already stopped or node is invalid
          }
          sourceNodeRef.current.disconnect();
        }

        console.log("Creating and starting new source node");
        sourceNodeRef.current = audioContextRef.current.createBufferSource();
        sourceNodeRef.current.buffer = audioBufferRef.current;
        sourceNodeRef.current.loop = true;
        sourceNodeRef.current.connect(gainNodeRef.current);
        sourceNodeRef.current.start(0);
        setPlaybackState("playing"); // Set state after successful start

        // Reset onended handler for the new node
        sourceNodeRef.current.onended = () => {
          console.log("SourceNode ended");
          // Check ref still matches before setting state
          // Using 'this' inside an arrow function refers to the outer scope, not the node itself.
          // We don't need to check the ref here, just update state if it was playing.
          setPlaybackState((current) =>
            current === "playing" ? "stopped" : current
          );
          sourceNodeRef.current = null; // Clear ref
        };
      }
      // If context was resumed but source still exists (unlikely with current pause logic, but possible)
      // We might not need to do anything extra here if resume() worked.
      // If state isn't 'playing' after resume, set it.
      else if (playbackState !== "playing") {
        console.log("Context resumed, setting state to playing");
        setPlaybackState("playing");
      }
    } catch (err) {
      console.error("Error during play operation:", err);
      setPlaybackState("stopped"); // Ensure stopped state on error
    }
  }, [playbackState, isAudioReady]); // Depend on state and readiness

  const pause = useCallback(async () => {
    // Make async to await suspend
    if (!audioContextRef.current || playbackState !== "playing") return;

    console.log("Suspending AudioContext");
    try {
      await audioContextRef.current.suspend(); // Await suspend
      setPlaybackState("paused");
      // We don't stop/disconnect the source node when suspending context
    } catch (err) {
      console.error("Error suspending AudioContext:", err);
    }
  }, [playbackState]);

  const togglePlayback = useCallback(() => {
    console.log(
      `TogglePlayback called. Current state: ${playbackState}, IsReady: ${isAudioReady}`
    );
    if (!isAudioReady) {
      console.warn("Audio not ready, cannot toggle playback.");
      // Optionally try to load audio again? Or show user feedback?
      return;
    }
    if (playbackState === "playing") {
      pause();
    } else {
      play(); // Handles 'paused' and 'stopped'
    }
  }, [playbackState, isAudioReady, play, pause]);

  // --- Volume Control ---
  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setInternalVolume(clampedVolume);
    if (gainNodeRef.current && audioContextRef.current) {
      gainNodeRef.current.gain.setValueAtTime(
        clampedVolume,
        audioContextRef.current.currentTime
      );
    }
  }, []);

  // Memoize the context value
  const value = useMemo(
    () => ({ playbackState, togglePlayback, volume, setVolume }),
    [playbackState, togglePlayback, volume, setVolume]
  );

  return (
    <AmbienceContext.Provider value={value}>
      {children}
    </AmbienceContext.Provider>
  );
};

export const useAmbience = (): AmbienceContextType => {
  const context = useContext(AmbienceContext);
  if (!context) {
    throw new Error("useAmbience must be used within an AmbienceProvider");
  }
  return context;
};
