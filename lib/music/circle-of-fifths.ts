// Pure key-relationship helpers built around the circle of fifths.
import type { KeyMode, NoteName } from "@/types/music";
import {
  chromaOf,
  nameFromChroma,
  preferAccidentalFor,
} from "@/lib/music/notes";

/** The 12 keys, clockwise from C, spelled with sharps. */
export const CIRCLE: NoteName[] = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "F",
];

/** Chroma of each circle position, for distance lookups. */
const CIRCLE_CHROMA: number[] = CIRCLE.map(chromaOf);

/** Order accidentals are added to a key signature (sharps then flats). */
const SHARP_ORDER: NoteName[] = ["F#", "C#", "G#", "D#", "A#", "F", "C"];
const FLAT_ORDER: NoteName[] = ["Bb", "Eb", "Ab", "Db", "Gb", "B", "E"];

type SignatureInfo = { type: "sharp" | "flat" | "natural"; count: number };

/** Key-signature accidentals for every note name treated as a major key. */
const MAJOR_KEY_SIGNATURE: Record<NoteName, SignatureInfo> = {
  C: { type: "natural", count: 0 },
  G: { type: "sharp", count: 1 },
  D: { type: "sharp", count: 2 },
  A: { type: "sharp", count: 3 },
  E: { type: "sharp", count: 4 },
  B: { type: "sharp", count: 5 },
  "F#": { type: "sharp", count: 6 },
  "C#": { type: "sharp", count: 7 },
  F: { type: "flat", count: 1 },
  Bb: { type: "flat", count: 2 },
  Eb: { type: "flat", count: 3 },
  Ab: { type: "flat", count: 4 },
  Db: { type: "flat", count: 5 },
  Gb: { type: "flat", count: 6 },
  // Enharmonic spellings, resolved to their common key.
  "D#": { type: "flat", count: 3 },
  "G#": { type: "flat", count: 4 },
  "A#": { type: "flat", count: 2 },
};

function circleIndexOf(name: NoteName): number {
  return CIRCLE_CHROMA.indexOf(chromaOf(name));
}

/** Relative minor of a major key (a minor third below the tonic). */
export function getRelativeMinor(majorKey: NoteName): NoteName {
  return nameFromChroma(chromaOf(majorKey) + 9, preferAccidentalFor(majorKey));
}

/** Relative major of a minor key (a minor third above the tonic). */
export function getRelativeMajor(minorKey: NoteName): NoteName {
  return nameFromChroma(chromaOf(minorKey) + 3, preferAccidentalFor(minorKey));
}

/** Sharps and flats in a key's signature. */
export function keySignature(
  tonic: NoteName,
  mode: KeyMode,
): { sharps: NoteName[]; flats: NoteName[] } {
  const majorTonic = mode === "minor" ? getRelativeMajor(tonic) : tonic;
  const info = MAJOR_KEY_SIGNATURE[majorTonic];
  if (info.type === "sharp") {
    return { sharps: SHARP_ORDER.slice(0, info.count), flats: [] };
  }
  if (info.type === "flat") {
    return { sharps: [], flats: FLAT_ORDER.slice(0, info.count) };
  }
  return { sharps: [], flats: [] };
}

/** Steps around the circle of fifths between two keys (0-6). */
export function distanceOnCircle(a: NoteName, b: NoteName): number {
  const diff = Math.abs(circleIndexOf(a) - circleIndexOf(b));
  return Math.min(diff, 12 - diff);
}
