// Pure scale generation: major, minor, modes, pentatonics, blues.
import type { NoteName, Scale, ScaleType } from "@/types/music";
import {
  chromaOf,
  nameFromChroma,
  preferAccidentalFor,
} from "@/lib/music/notes";

/** Semitone steps between consecutive scale degrees (each row sums to 12). */
export const SCALE_FORMULAS: Record<ScaleType, number[]> = {
  major: [2, 2, 1, 2, 2, 2, 1],
  "natural-minor": [2, 1, 2, 2, 1, 2, 2],
  "harmonic-minor": [2, 1, 2, 2, 1, 3, 1],
  "melodic-minor": [2, 1, 2, 2, 2, 2, 1],
  "major-pentatonic": [2, 2, 3, 2, 3],
  "minor-pentatonic": [3, 2, 2, 3, 2],
  blues: [3, 2, 1, 1, 3, 2],
  dorian: [2, 1, 2, 2, 2, 1, 2],
  phrygian: [1, 2, 2, 2, 1, 2, 2],
  lydian: [2, 2, 2, 1, 2, 2, 1],
  mixolydian: [2, 2, 1, 2, 2, 1, 2],
  locrian: [1, 2, 2, 1, 2, 2, 2],
};

/** Church modes of the major scale, in degree order. */
const MAJOR_MODE_SEQUENCE: ScaleType[] = [
  "major",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "natural-minor",
  "locrian",
];

/** Converts step-formula into cumulative semitone offsets from the tonic. */
function offsetsFromFormula(type: ScaleType): number[] {
  const formula = SCALE_FORMULAS[type];
  const offsets: number[] = [0];
  let sum = 0;
  for (let i = 0; i < formula.length - 1; i += 1) {
    sum += formula[i];
    offsets.push(sum);
  }
  return offsets;
}

/** Builds a Scale (notes + interval offsets) from a tonic and scale type. */
export function buildScale(tonic: NoteName, type: ScaleType): Scale {
  const prefer = preferAccidentalFor(tonic);
  const root = chromaOf(tonic);
  const intervals = offsetsFromFormula(type);
  const notes = intervals.map((semi) => nameFromChroma(root + semi, prefer));
  return { tonic, type, notes, intervals };
}

/** Returns the note at a 1-indexed scale degree (wraps for degrees > length). */
export function getScaleDegree(scale: Scale, degree: number): NoteName {
  if (!Number.isInteger(degree)) {
    throw new Error(`Scale degree must be an integer: ${degree}`);
  }
  const len = scale.notes.length;
  return scale.notes[(((degree - 1) % len) + len) % len];
}

/** Whether a note belongs to a scale (compared by pitch class). */
export function scaleContainsNote(scale: Scale, note: NoteName): boolean {
  const target = chromaOf(note);
  return scale.notes.some((n) => chromaOf(n) === target);
}

/**
 * The 7 modes of the major scale whose tonic is `tonic`, each starting on a
 * successive degree (Ionian, Dorian, Phrygian, Lydian, Mixolydian, Aeolian,
 * Locrian).
 */
export function getModesOf(tonic: NoteName): Scale[] {
  const parent = buildScale(tonic, "major");
  return MAJOR_MODE_SEQUENCE.map((type, degree) =>
    buildScale(parent.notes[degree], type),
  );
}
