// Pure interval calculations between notes.
import type { Interval, IntervalQuality, Note } from "@/types/music";
import { noteFromMidi } from "@/lib/music/notes";

/**
 * All 13 intervals from a perfect unison (P1) to a perfect octave (P8),
 * indexed by semitone count (0-12).
 */
export const INTERVALS: Interval[] = [
  { semitones: 0, name: "P1", quality: "P" },
  { semitones: 1, name: "m2", quality: "m" },
  { semitones: 2, name: "M2", quality: "M" },
  { semitones: 3, name: "m3", quality: "m" },
  { semitones: 4, name: "M3", quality: "M" },
  { semitones: 5, name: "P4", quality: "P" },
  { semitones: 6, name: "A4", quality: "A" },
  { semitones: 7, name: "P5", quality: "P" },
  { semitones: 8, name: "m6", quality: "m" },
  { semitones: 9, name: "M6", quality: "M" },
  { semitones: 10, name: "m7", quality: "m" },
  { semitones: 11, name: "M7", quality: "M" },
  { semitones: 12, name: "P8", quality: "P" },
];

/** Quality of the interval for a given semitone count (octave-reduced). */
export function intervalQuality(semitones: number): IntervalQuality {
  const table: IntervalQuality[] = [
    "P",
    "m",
    "M",
    "m",
    "M",
    "P",
    "A",
    "P",
    "m",
    "M",
    "m",
    "M",
  ];
  return table[((semitones % 12) + 12) % 12];
}

/** The interval between two notes (direction-independent). */
export function intervalBetween(a: Note, b: Note): Interval {
  const semitones = Math.abs(b.midi - a.midi);
  const reduced = semitones % 12;
  const index = reduced === 0 && semitones > 0 ? 12 : reduced;
  const base = INTERVALS[index];
  return { semitones, name: base.name, quality: base.quality };
}

/** The note a given number of semitones above (or below) a root note. */
export function noteAtInterval(root: Note, semitones: number): Note {
  return noteFromMidi(root.midi + semitones);
}
