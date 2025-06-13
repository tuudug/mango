import { create } from 'zustand';

export type PlaybackState = "playing" | "paused" | "stopped";

// Module-scoped variables for Web Audio API objects
let audioContext: AudioContext | null = null;
let gainNode: GainNode | null = null;
let audioBuffer: AudioBuffer | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
const AUDIO_SRC = "/audio/rain.flac"; // Ensure this path is correct in your public folder

interface AmbienceState {
  playbackState: PlaybackState;
  volume: number;
  isAudioReady: boolean;
  initAudio: () => Promise<void>;
  togglePlayback: () => void;
  setVolume: (newVolume: number) => void;
  _play: () => Promise<void>;
  _pause: () => Promise<void>;
  _cleanupAudio: () => void;
}

export const useAmbienceStore = create<AmbienceState>((set, get) => ({
  playbackState: 'stopped',
  volume: 0.5,
  isAudioReady: false,

  initAudio: async () => {
    if (get().isAudioReady || audioContext) {
      console.log("[AmbienceStore] Audio already initialized or initialization in progress.");
      return;
    }
    console.log("[AmbienceStore] Initializing audio...");

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.value = get().volume; // Set initial volume

      const response = await fetch(AUDIO_SRC);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      set({ isAudioReady: true });
      console.log("[AmbienceStore] Audio initialized successfully.");
    } catch (error) {
      console.error("[AmbienceStore] Error initializing audio:", error);
      set({ isAudioReady: false });
      // Reset global vars on failure
      if (audioContext) {
        audioContext.close().catch(console.error); // Close context on error
        audioContext = null;
      }
      gainNode = null;
      audioBuffer = null;
      sourceNode = null;
      throw error; // Re-throw for potential callers to handle
    }
  },

  _play: async () => {
    if (!audioContext || !audioBuffer || !gainNode || get().playbackState === 'playing') {
      console.warn("[AmbienceStore] Cannot play: Audio not ready or already playing.", {
        audioContextReady: !!audioContext,
        audioBufferReady: !!audioBuffer,
        gainNodeReady: !!gainNode,
        playbackState: get().playbackState,
      });
      return;
    }

    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    if (sourceNode) { // Clean up previous source if any (e.g., after pause)
        sourceNode.onended = null; // Remove previous onended handler
        sourceNode.stop();
        sourceNode.disconnect();
    }

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;
    sourceNode.loop = true;
    sourceNode.connect(gainNode);
    sourceNode.start();

    set({ playbackState: 'playing' });

    sourceNode.onended = () => {
      // This is called when sourceNode.stop() is called, or if the sound naturally ends (not applicable for loop=true)
      // We only want to set to 'stopped' if it wasn't an intentional pause or stop action.
      // However, with loop=true, this will only fire on explicit stop.
      // If playbackState is already 'paused' or 'stopped' due to user action, don't override.
      if (get().playbackState === 'playing') { // Only if it was 'playing' and stopped unexpectedly (e.g. external reason)
        console.log("[AmbienceStore] SourceNode ended while in playing state.");
        // set({ playbackState: 'stopped' }); // This might conflict with explicit stop/pause
      }
    };
  },

  _pause: async () => {
    if (!audioContext || !sourceNode || get().playbackState !== 'playing') {
        console.warn("[AmbienceStore] Cannot pause: No active source or not playing.");
        return;
    }
    // Instead of audioContext.suspend(), we stop the source to allow restarting it.
    // Suspending the context is more global and harder to manage for simple play/pause.
    sourceNode.stop();
    // sourceNode.disconnect(); // Disconnect to allow garbage collection
    // sourceNode = null; // Important: Set to null after stopping
    set({ playbackState: 'paused' });
  },

  togglePlayback: async () => {
    if (!get().isAudioReady) {
      console.log("[AmbienceStore] Audio not ready, attempting to initialize first.");
      try {
        await get().initAudio(); // Ensure audio is initialized
        if (!get().isAudioReady) { // Check again after init attempt
          console.error("[AmbienceStore] Initialization failed, cannot toggle playback.");
          return;
        }
      } catch (error) {
        console.error("[AmbienceStore] Initialization failed during toggle, cannot play.", error);
        return;
      }
    }

    const currentPlaybackState = get().playbackState;
    if (currentPlaybackState === 'playing') {
      await get()._pause();
    } else { // 'paused' or 'stopped'
      await get()._play();
    }
  },

  setVolume: (newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    set({ volume: clampedVolume });
    if (gainNode) {
      gainNode.gain.setValueAtTime(clampedVolume, audioContext?.currentTime || 0);
    }
  },

  _cleanupAudio: () => {
    console.log("[AmbienceStore] Cleaning up audio resources...");
    if (sourceNode) {
      try {
        sourceNode.onended = null; // Important to remove listener before stopping
        sourceNode.stop();
        sourceNode.disconnect();
      } catch(e) {
        console.warn("[AmbienceStore] Error stopping sourceNode during cleanup:", e);
      }
      sourceNode = null;
    }
    // Don't disconnect gainNode from destination if we might re-init audio later
    // gainNode?.disconnect();
    // gainNode = null; // Keep gainNode if context is kept

    // Closing AudioContext is a very final step. Usually, you might keep it.
    // If you are sure the app won't use ambience audio again without full page reload:
    if (audioContext) {
       audioContext.close().then(() => {
           console.log("[AmbienceStore] AudioContext closed.");
       }).catch(e => console.error("[AmbienceStore] Error closing AudioContext:", e));
       audioContext = null;
       gainNode = null; // If context is closed, gainNode is invalid
       audioBuffer = null; // Clear buffer as well
    }

    set({ isAudioReady: false, playbackState: 'stopped' });
  },
}));

// Attempt to initialize audio when the store module is loaded.
// This is a good place for auto-init if the ambience sound is core to the app experience.
// However, browsers might block AudioContext creation before user interaction.
// A button like "Enable Sound" that calls initAudio might be more robust.
// For now, let's try auto-init and log errors.
useAmbienceStore.getState().initAudio().catch(error => {
  console.warn("[AmbienceStore] Failed to auto-initialize ambience audio. User interaction might be required.", error);
  // Components should check `isAudioReady` and potentially offer an init button.
});

// Optional: Handle HMR cleanup for audio resources
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    useAmbienceStore.getState()._cleanupAudio();
    console.log("[AmbienceStore] Cleaned up audio resources on HMR dispose.");
  });
}
