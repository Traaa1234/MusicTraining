// Instrument samplers with a synth fallback.
//
// Piano uses the Salamander grand piano sample set; guitar uses the acoustic
// guitar set from nbrosowsky/tonejs-instruments. Sample loading is async and
// can race, so each instrument tracks its own load state and exposes a
// readiness promise. Until samples finish (or if they fail), playback falls
// back to a PolySynth so the app is always audible.
import * as Tone from "tone";
import {
  type InstrumentLoadState,
  type InstrumentName,
  useAudioStore,
} from "@/lib/store/audio-store";

/** A playable Tone.js source — a loaded Sampler or the synth fallback. */
export type Instrument = Tone.Sampler | Tone.PolySynth;

const PIANO_BASE_URL = "https://tonejs.github.io/audio/salamander/";

/** Salamander piano samples (Tone.Sampler pitch-shifts to fill the gaps). */
const PIANO_SAMPLES: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
};

const GUITAR_BASE_URL =
  "https://nbrosowsky.github.io/tonejs-instruments/samples/guitar-acoustic/";

/** Acoustic guitar samples (natural notes only, to minimise missing files). */
const GUITAR_SAMPLES: Record<string, string> = {
  E2: "E2.mp3",
  G2: "G2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  D3: "D3.mp3",
  E3: "E3.mp3",
  G3: "G3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  D4: "D4.mp3",
  E4: "E4.mp3",
  G4: "G4.mp3",
};

type SampledInstrument = Exclude<InstrumentName, "synth">;

type Entry = {
  instance: Instrument | null;
  ready: Promise<Instrument> | null;
};

const registry: Record<InstrumentName, Entry> = {
  piano: { instance: null, ready: null },
  guitar: { instance: null, ready: null },
  synth: { instance: null, ready: null },
};

function setLoadState(name: InstrumentName, state: InstrumentLoadState): void {
  useAudioStore.getState().setInstrumentLoad(name, state);
}

/** Creates the shared PolySynth used both as "synth" and as the fallback. */
function createSynth(): Tone.PolySynth {
  const synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.2, sustain: 0.3, release: 1 },
  }).toDestination();
  synth.volume.value = -10;
  return synth;
}

/** Creates a Sampler plus a promise that settles when its samples load. */
function createSampler(name: SampledInstrument): {
  sampler: Tone.Sampler;
  ready: Promise<Instrument>;
} {
  const config =
    name === "piano"
      ? { urls: PIANO_SAMPLES, baseUrl: PIANO_BASE_URL }
      : { urls: GUITAR_SAMPLES, baseUrl: GUITAR_BASE_URL };

  let resolve!: (instrument: Instrument) => void;
  let reject!: (error: unknown) => void;
  const ready = new Promise<Instrument>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  const sampler = new Tone.Sampler({
    urls: config.urls,
    baseUrl: config.baseUrl,
    release: 1,
    onload: () => {
      setLoadState(name, "ready");
      resolve(sampler);
    },
    onerror: (error) => {
      setLoadState(name, "error");
      reject(error);
    },
  }).toDestination();

  return { sampler, ready };
}

/**
 * Returns the primary instance for an instrument, creating it (and kicking off
 * sample loading) on first use. Piano/guitar return a Tone.Sampler; "synth"
 * returns a Tone.PolySynth.
 */
export function getInstrument(name: InstrumentName): Instrument {
  const entry = registry[name];
  if (entry.instance) return entry.instance;

  if (name === "synth") {
    entry.instance = createSynth();
    entry.ready = Promise.resolve(entry.instance);
    setLoadState("synth", "ready");
    return entry.instance;
  }

  setLoadState(name, "loading");
  const { sampler, ready } = createSampler(name);
  entry.instance = sampler;
  entry.ready = ready;
  // Swallow rejection here so an unhandled promise rejection isn't logged;
  // callers that care use `loadInstrument` / `getInstrumentState`.
  ready.catch(() => undefined);
  return sampler;
}

/** Resolves once the instrument's samples are loaded (or rejects on failure). */
export function loadInstrument(name: InstrumentName): Promise<Instrument> {
  getInstrument(name);
  return registry[name].ready ?? Promise.resolve(getInstrument(name));
}

/**
 * Returns a guaranteed-playable instrument: the requested sampler if its
 * samples are ready, otherwise the synth fallback.
 */
export function getPlayableInstrument(name: InstrumentName): Instrument {
  if (name === "synth") return getInstrument("synth");
  const instrument = getInstrument(name);
  const loadState = useAudioStore.getState().instrumentLoad[name];
  return loadState === "ready" ? instrument : getInstrument("synth");
}

/** Returns an already-created instance without creating one. */
export function peekInstrument(name: InstrumentName): Instrument | null {
  return registry[name].instance;
}

/** Current sample load state for an instrument. */
export function getInstrumentState(name: InstrumentName): InstrumentLoadState {
  return useAudioStore.getState().instrumentLoad[name];
}
