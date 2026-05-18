// Singleton Tone.js audio context lifecycle.
//
// Browsers (especially iOS Safari) start an AudioContext in the "suspended"
// state — it can only be resumed inside a user-gesture handler. `getAudioContext`
// performs that resume lazily and is safe to call repeatedly; concurrent calls
// share a single in-flight start promise. Context state is mirrored into the
// Zustand audio store so React components can react to it.
import * as Tone from "tone";
import { useAudioStore } from "@/lib/store/audio-store";

let startPromise: Promise<Tone.BaseContext> | null = null;

/**
 * Lazily starts (and resumes) the Tone.js audio context. Must first be reached
 * from a user gesture. Resolves with the live context once ready.
 */
export async function getAudioContext(): Promise<Tone.BaseContext> {
  if (useAudioStore.getState().contextState === "ready") {
    return Tone.getContext();
  }
  if (startPromise) {
    return startPromise;
  }

  useAudioStore.getState().setContextState("starting");
  startPromise = (async () => {
    try {
      await Tone.start();

      // iOS Safari can still report "suspended" after Tone.start().
      const context = Tone.getContext();
      if (context.rawContext.state === "suspended") {
        await context.resume();
      }

      // Apply any volume/mute the user set before audio was live.
      const { masterVolumeDb, muted } = useAudioStore.getState();
      Tone.getDestination().volume.value = masterVolumeDb;
      Tone.getDestination().mute = muted;

      useAudioStore.getState().setContextState("ready");
      return context;
    } catch (error) {
      useAudioStore.getState().setContextState("error");
      startPromise = null; // allow a retry
      throw error;
    }
  })();

  return startPromise;
}

/** Sets the master output volume in decibels and mirrors it to the store. */
export function setMasterVolume(db: number): void {
  Tone.getDestination().volume.value = db;
  useAudioStore.getState().setMasterVolumeDb(db);
}

/** Mutes or unmutes the master output and mirrors it to the store. */
export function setMute(muted: boolean): void {
  Tone.getDestination().mute = muted;
  useAudioStore.getState().setMuted(muted);
}
