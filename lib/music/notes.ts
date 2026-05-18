// Pure note-name helpers: spelling, enharmonics, MIDI/frequency conversion.
//
// This module is the foundation of the music engine — every other module in
// lib/music builds on the chroma (pitch-class 0-11) helpers exported here.
// No audio, no React, no DOM.
import type { Note, NoteName } from "@/types/music";

/** The 12 pitch classes spelled with sharps, indexed by chroma (0-11). */
export const SHARP_NOTE_NAMES: NoteName[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

/** The 12 pitch classes spelled with flats, indexed by chroma (0-11). */
export const FLAT_NOTE_NAMES: NoteName[] = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

/** Pitch class (0-11) for every supported note name. */
export const CHROMA_BY_NAME: Record<NoteName, number> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
};

/** Sharp/flat enharmonic partner. Naturals map to themselves. */
const ENHARMONIC: Record<NoteName, NoteName> = {
  C: "C",
  "C#": "Db",
  Db: "C#",
  D: "D",
  "D#": "Eb",
  Eb: "D#",
  E: "E",
  F: "F",
  "F#": "Gb",
  Gb: "F#",
  G: "G",
  "G#": "Ab",
  Ab: "G#",
  A: "A",
  "A#": "Bb",
  Bb: "A#",
  B: "B",
};

/** Base pitch class of each letter, before accidentals are applied. */
const LETTER_CHROMA: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

export type AccidentalPreference = "sharp" | "flat";

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** Pitch class (0-11) of a note name. */
export function chromaOf(name: NoteName): number {
  return CHROMA_BY_NAME[name];
}

/** Spells a pitch class as a note name, using sharps or flats as requested. */
export function nameFromChroma(
  chroma: number,
  prefer: AccidentalPreference = "sharp",
): NoteName {
  const c = mod(chroma, 12);
  return prefer === "flat" ? FLAT_NOTE_NAMES[c] : SHARP_NOTE_NAMES[c];
}

/**
 * Picks a sensible accidental spelling for a tonic: flats for flat keys and
 * for F, sharps otherwise. Deterministic, used by scales/chords/keys.
 */
export function preferAccidentalFor(tonic: NoteName): AccidentalPreference {
  if (tonic.includes("b")) return "flat";
  if (tonic.includes("#")) return "sharp";
  return tonic === "F" ? "flat" : "sharp";
}

/** Frequency in Hz for a MIDI note. A4 (MIDI 69) = 440 Hz. */
export function frequencyFromMidi(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Builds a full Note from a MIDI number. Spelled with sharps. */
export function noteFromMidi(midi: number): Note {
  if (!Number.isInteger(midi)) {
    throw new Error(`MIDI number must be an integer: ${midi}`);
  }
  const chroma = mod(midi, 12);
  return {
    name: SHARP_NOTE_NAMES[chroma],
    octave: Math.floor(midi / 12) - 1,
    midi,
    freq: frequencyFromMidi(midi),
  };
}

/** MIDI number for a note name at an octave. C4 = 60, A4 = 69. */
export function midiFromNote(name: NoteName, octave: number): number {
  return CHROMA_BY_NAME[name] + (octave + 1) * 12;
}

/** Enharmonic partner of a note name (C# <-> Db). Naturals are unchanged. */
export function enharmonicEquivalent(name: NoteName): NoteName {
  return ENHARMONIC[name];
}

/**
 * Parses a loosely-typed note name into a canonical NoteName.
 * Accepts e.g. "c#", "C sharp", "Db", "E♭", "F natural".
 * Spellings outside the 17-name set (E#, Cb, double accidentals) are
 * resolved to their nearest single-accidental equivalent.
 */
export function normalizeNoteName(name: string): NoteName {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/♯/g, "#")
    .replace(/♭/g, "b")
    .replace(/\bsharp\b/g, "#")
    .replace(/\bflat\b/g, "b")
    .replace(/\bnatural\b/g, "")
    .replace(/[\s_-]+/g, "");

  const letter = cleaned[0]?.toUpperCase() ?? "";
  if (!(letter in LETTER_CHROMA)) {
    throw new Error(`Cannot parse note name: "${name}"`);
  }

  let offset = 0;
  for (const ch of cleaned.slice(1)) {
    if (ch === "#") offset += 1;
    else if (ch === "b") offset -= 1;
    else throw new Error(`Cannot parse note name: "${name}"`);
  }

  const chroma = mod(LETTER_CHROMA[letter] + offset, 12);
  return nameFromChroma(chroma, offset < 0 ? "flat" : "sharp");
}

/** Parses a pitch string like "E2" or "C#4" into a note name + octave. */
export function parsePitch(pitch: string): { name: NoteName; octave: number } {
  const match = pitch.trim().match(/^([A-Ga-g][#b♯♭]*)(-?\d+)$/);
  if (!match) {
    throw new Error(`Cannot parse pitch: "${pitch}"`);
  }
  return {
    name: normalizeNoteName(match[1]),
    octave: Number.parseInt(match[2], 10),
  };
}

/** MIDI number for a pitch string like "E2". */
export function midiFromPitch(pitch: string): number {
  const { name, octave } = parsePitch(pitch);
  return midiFromNote(name, octave);
}
