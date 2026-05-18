// High-level playback: notes, chords, scales, and sequences.
//
// Scheduling notes:
//  - Each note is triggered with `Tone.now() + offset` so the attack lands on
//    a precise audio-clock time (never bare Date.now()).
//  - Multi-note timelines (scales, sequences, arpeggios) are driven by JS
//    timers that hand each note to Tone as it comes due. This keeps `stopAll`
//    able to cancel everything still pending.
import * as Tone from "tone";
import type { Chord, Note, Scale } from "@/types/music";
import { frequencyFromMidi, midiFromNote } from "@/lib/music/notes";
import { useAudioStore } from "@/lib/store/audio-store";
import { getPlayableInstrument, peekInstrument } from "@/lib/audio/sampler";
import { getAudioContext } from "@/lib/audio/tone-context";

/** Small offset (seconds) so scheduled attacks never land in the past. */
const SCHEDULE_OFFSET = 0.03;

/** Pending JS timers, so `stopAll` can cancel notes that haven't fired yet. */
const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

function currentInstrument() {
  return getPlayableInstrument(useAudioStore.getState().instrument);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const id = setTimeout(() => {
      pendingTimers.delete(id);
      resolve();
    }, ms);
    pendingTimers.add(id);
  });
}

/** Runs `fn` after `ms`, tracked so `stopAll` can cancel it. */
function scheduleTrigger(ms: number, fn: () => void): void {
  const id = setTimeout(() => {
    pendingTimers.delete(id);
    fn();
  }, ms);
  pendingTimers.add(id);
}

/** Triggers a single frequency on the currently selected instrument. */
function trigger(freq: number, duration: number, velocity: number): void {
  currentInstrument().triggerAttackRelease(
    freq,
    duration,
    Tone.now() + SCHEDULE_OFFSET,
    velocity,
  );
}

/** Stacks a chord's note names into ascending MIDI numbers from octave 4. */
function chordToMidi(chord: Chord): number[] {
  const midis: number[] = [];
  let previous = -Infinity;
  for (const name of chord.notes) {
    let midi = midiFromNote(name, 4);
    while (midi <= previous) midi += 12;
    midis.push(midi);
    previous = midi;
  }
  return midis;
}

/** Expands a scale into ascending MIDI numbers spanning `octaves`. */
function scaleToMidi(scale: Scale, octaves: number): number[] {
  const tonic = midiFromNote(scale.tonic, 4);
  const midis: number[] = [];
  for (let octave = 0; octave < octaves; octave += 1) {
    for (const semitones of scale.intervals) {
      midis.push(tonic + octave * 12 + semitones);
    }
  }
  midis.push(tonic + octaves * 12); // close on the upper tonic
  return midis;
}

/** Plays a single note. Resolves once its duration has elapsed. */
export async function playNote(
  note: Note,
  duration = 0.5,
  velocity = 0.8,
): Promise<void> {
  await getAudioContext();
  trigger(note.freq, duration, velocity);
  await delay(duration * 1000 + 150);
}

/** Plays a chord, either as a block or strummed. */
export async function playChord(
  chord: Chord,
  duration = 1,
  arpeggiate = false,
): Promise<void> {
  await getAudioContext();
  const midis = chordToMidi(chord);

  if (!arpeggiate) {
    const instrument = currentInstrument();
    const time = Tone.now() + SCHEDULE_OFFSET;
    for (const midi of midis) {
      instrument.triggerAttackRelease(
        frequencyFromMidi(midi),
        duration,
        time,
        0.7,
      );
    }
    await delay(duration * 1000 + 150);
    return;
  }

  const strum = 0.13; // seconds between strummed notes
  midis.forEach((midi, index) => {
    scheduleTrigger(index * strum * 1000, () =>
      trigger(frequencyFromMidi(midi), duration, 0.7),
    );
  });
  await delay(midis.length * strum * 1000 + duration * 1000 + 150);
}

/** Plays a scale up, down, or both, one note per beat at `tempo`. */
export async function playScale(
  scale: Scale,
  octaves = 1,
  tempo = 120,
  direction: "up" | "down" | "both" = "up",
): Promise<void> {
  await getAudioContext();
  const ascending = scaleToMidi(scale, octaves);

  let midis: number[];
  if (direction === "down") {
    midis = [...ascending].reverse();
  } else if (direction === "both") {
    midis = [...ascending, ...[...ascending].reverse().slice(1)];
  } else {
    midis = ascending;
  }

  const interval = 60 / tempo; // seconds per note
  midis.forEach((midi, index) => {
    scheduleTrigger(index * interval * 1000, () =>
      trigger(frequencyFromMidi(midi), interval * 0.9, 0.8),
    );
  });
  await delay(midis.length * interval * 1000 + 200);
}

/** Plays an explicit sequence of notes, one per beat at `tempo`. */
export async function playSequence(
  notes: Note[],
  tempo: number,
): Promise<void> {
  await getAudioContext();
  const interval = 60 / tempo;
  notes.forEach((note, index) => {
    scheduleTrigger(index * interval * 1000, () =>
      trigger(note.freq, interval * 0.9, 0.8),
    );
  });
  await delay(notes.length * interval * 1000 + 200);
}

/**
 * Plays an arbitrary set of notes. `gap` is the spacing (seconds) between note
 * starts — pass 0 for a simultaneous (harmonic) cluster.
 */
export async function playNotes(
  notes: Note[],
  options: { gap?: number; duration?: number; velocity?: number } = {},
): Promise<void> {
  await getAudioContext();
  const { gap = 0, duration = 0.7, velocity = 0.8 } = options;
  notes.forEach((note, index) => {
    scheduleTrigger(index * gap * 1000, () =>
      trigger(note.freq, duration, velocity),
    );
  });
  const span = gap > 0 ? (notes.length - 1) * gap : 0;
  await delay(span * 1000 + duration * 1000 + 150);
}

/** Cancels every pending note and releases anything currently sounding. */
export function stopAll(): void {
  for (const id of pendingTimers) clearTimeout(id);
  pendingTimers.clear();

  for (const name of ["piano", "guitar", "synth"] as const) {
    peekInstrument(name)?.releaseAll();
  }
}
