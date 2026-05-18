// Pure chord building, identification, and diatonic harmony.
import type { Chord, ChordQuality, NoteName, Scale } from "@/types/music";
import {
  chromaOf,
  nameFromChroma,
  preferAccidentalFor,
} from "@/lib/music/notes";

/** Semitone offsets from the chord root for each supported quality. */
export const CHORD_FORMULAS: Record<ChordQuality, number[]> = {
  // triads
  major: [0, 4, 7],
  minor: [0, 3, 7],
  diminished: [0, 3, 6],
  augmented: [0, 4, 8],
  // suspended
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  // sevenths
  major7: [0, 4, 7, 11],
  minor7: [0, 3, 7, 10],
  dominant7: [0, 4, 7, 10],
  minor7b5: [0, 3, 6, 10],
  diminished7: [0, 3, 6, 9],
  // sixths
  major6: [0, 4, 7, 9],
  minor6: [0, 3, 7, 9],
  // added tone
  add9: [0, 4, 7, 14],
};

/** Display suffix appended to the root for each quality. */
const CHORD_SUFFIX: Record<ChordQuality, string> = {
  major: "",
  minor: "m",
  diminished: "dim",
  augmented: "aug",
  sus2: "sus2",
  sus4: "sus4",
  major7: "maj7",
  minor7: "m7",
  dominant7: "7",
  minor7b5: "m7b5",
  diminished7: "dim7",
  major6: "6",
  minor6: "m6",
  add9: "add9",
};

/** Order chord-detection tries qualities in (triads before extensions). */
const DETECTION_ORDER: ChordQuality[] = [
  "major",
  "minor",
  "diminished",
  "augmented",
  "sus2",
  "sus4",
  "major7",
  "dominant7",
  "minor7",
  "minor7b5",
  "diminished7",
  "major6",
  "minor6",
  "add9",
];

/** The chord symbol, e.g. "Cmaj7", "Dm", "G7". */
export function chordSymbol(chord: Chord): string {
  return chord.root + CHORD_SUFFIX[chord.quality];
}

/** Builds a Chord (notes + symbol) from a root and quality. */
export function buildChord(root: NoteName, quality: ChordQuality): Chord {
  const prefer = preferAccidentalFor(root);
  const rootChroma = chromaOf(root);
  const notes = CHORD_FORMULAS[quality].map((semi) =>
    nameFromChroma(rootChroma + semi, prefer),
  );
  return { root, quality, notes, symbol: root + CHORD_SUFFIX[quality] };
}

/** Sorted, de-duplicated pitch-class set relative to a root chroma. */
function pitchClassSet(chromas: number[], rootChroma: number): number[] {
  const rel = chromas.map((c) => (((c - rootChroma) % 12) + 12) % 12);
  return [...new Set(rel)].sort((a, b) => a - b);
}

/** Identifies a chord from a set of note names, or null if none matches. */
export function chordFromNotes(notes: NoteName[]): Chord | null {
  if (notes.length < 3) return null;
  const chromas = notes.map(chromaOf);

  for (const rootName of notes) {
    const observed = pitchClassSet(chromas, chromaOf(rootName));
    for (const quality of DETECTION_ORDER) {
      const expected = pitchClassSet(CHORD_FORMULAS[quality], 0);
      if (
        expected.length === observed.length &&
        expected.every((value, i) => value === observed[i])
      ) {
        return buildChord(rootName, quality);
      }
    }
  }
  return null;
}

/**
 * The diatonic triads of a 7-note scale, one per degree
 * (e.g. I, ii, iii, IV, V, vi, vii° for a major scale).
 */
export function diatonicChords(scale: Scale): Chord[] {
  if (scale.notes.length !== 7) {
    throw new Error(
      `diatonicChords requires a 7-note scale, got ${scale.notes.length}`,
    );
  }

  const chords: Chord[] = [];
  for (let degree = 0; degree < 7; degree += 1) {
    const root = scale.notes[degree];
    const rootChroma = chromaOf(root);
    const third = (((chromaOf(scale.notes[(degree + 2) % 7]) - rootChroma) % 12) + 12) % 12;
    const fifth = (((chromaOf(scale.notes[(degree + 4) % 7]) - rootChroma) % 12) + 12) % 12;

    let quality: ChordQuality;
    if (fifth === 6) quality = "diminished";
    else if (fifth === 8) quality = "augmented";
    else if (third === 3) quality = "minor";
    else quality = "major";

    chords.push(buildChord(root, quality));
  }
  return chords;
}
