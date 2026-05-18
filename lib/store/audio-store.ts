// Global audio state: Tone.js context lifecycle, current instrument, master
// volume, and per-instrument sample load state. Plain Zustand store — safe to
// read/write from non-React modules via `useAudioStore.getState()`.
import { create } from "zustand";

/** Lifecycle of the shared Tone.js audio context. */
export type AudioContextState =
  | "uninitialized"
  | "starting"
  | "ready"
  | "error";

/** Instruments the playback engine can use. */
export type InstrumentName = "piano" | "guitar" | "synth";

/** Sample load lifecycle for a single instrument. */
export type InstrumentLoadState = "idle" | "loading" | "ready" | "error";

type AudioStore = {
  contextState: AudioContextState;
  instrument: InstrumentName;
  /** Master output volume in decibels (0 = unity, negative = quieter). */
  masterVolumeDb: number;
  muted: boolean;
  instrumentLoad: Record<InstrumentName, InstrumentLoadState>;
  setContextState: (state: AudioContextState) => void;
  setInstrument: (instrument: InstrumentName) => void;
  setMasterVolumeDb: (db: number) => void;
  setMuted: (muted: boolean) => void;
  setInstrumentLoad: (
    name: InstrumentName,
    state: InstrumentLoadState,
  ) => void;
};

export const useAudioStore = create<AudioStore>((set) => ({
  contextState: "uninitialized",
  instrument: "piano",
  masterVolumeDb: -6,
  muted: false,
  instrumentLoad: { piano: "idle", guitar: "idle", synth: "idle" },
  setContextState: (contextState) => set({ contextState }),
  setInstrument: (instrument) => set({ instrument }),
  setMasterVolumeDb: (masterVolumeDb) => set({ masterVolumeDb }),
  setMuted: (muted) => set({ muted }),
  setInstrumentLoad: (name, state) =>
    set((store) => ({
      instrumentLoad: { ...store.instrumentLoad, [name]: state },
    })),
}));
