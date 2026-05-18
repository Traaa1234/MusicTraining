"use client";

// App-wide audio provider. Tone.js cannot start until a user gesture, so this
// listens for the first interaction anywhere in the app and resumes the
// audio context then. Components read readiness via `useAudio()`.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getAudioContext } from "@/lib/audio/tone-context";

type AudioContextValue = {
  /** True once the Tone.js context has been resumed. */
  ready: boolean;
  /** Manually start the audio context (also runs on first gesture). */
  start: () => Promise<void>;
};

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const startingRef = useRef(false);

  const start = useCallback(async () => {
    if (startingRef.current) return;
    startingRef.current = true;
    await getAudioContext();
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) return;

    const handler = () => {
      void start();
    };
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    events.forEach((event) =>
      window.addEventListener(event, handler, { once: true }),
    );
    return () => {
      events.forEach((event) => window.removeEventListener(event, handler));
    };
  }, [ready, start]);

  return (
    <AudioContext.Provider value={{ ready, start }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio(): AudioContextValue {
  const value = useContext(AudioContext);
  if (!value) {
    throw new Error("useAudio must be used within <AudioProvider>");
  }
  return value;
}
