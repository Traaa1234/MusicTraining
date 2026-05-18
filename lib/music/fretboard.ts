// Pure guitar fretboard mapping, note finding, scale shapes, and CAGED shapes.
import type { Chord, Note, NoteName, Scale } from "@/types/music";
import { chromaOf, midiFromPitch, noteFromMidi } from "@/lib/music/notes";
import { scaleContainsNote } from "@/lib/music/scales";

/** Standard 6-string guitar tuning, low to high. */
export const STANDARD_TUNING: string[] = ["E2", "A2", "D3", "G3", "B3", "E4"];

/** Drop D tuning — the low E string dropped a whole step. */
export const DROP_D: string[] = ["D2", "A2", "D3", "G3", "B3", "E4"];

/** Open G tuning. */
export const OPEN_G: string[] = ["D2", "G2", "D3", "G3", "B3", "D4"];

/** DADGAD tuning. */
export const DADGAD: string[] = ["D2", "A2", "D3", "G3", "A3", "D4"];

/** A position on the fretboard. */
export type FretPosition = { string: number; fret: number };

/** A fretted position with an optional fretting-hand finger. */
export type FingeredPosition = FretPosition & { finger?: number };

/** One CAGED shape placement. */
export type CagedShape = {
  shape: "C" | "A" | "G" | "E" | "D";
  positions: FingeredPosition[];
};

/**
 * Builds the full fretboard as a 2D grid of Notes, indexed [string][fret].
 * Fret 0 is the open string; the grid has `numFrets + 1` columns.
 */
export function getFretboardMap(tuning: string[], numFrets: number): Note[][] {
  if (!Number.isInteger(numFrets) || numFrets < 0) {
    throw new Error(`numFrets must be a non-negative integer: ${numFrets}`);
  }
  return tuning.map((openString) => {
    const openMidi = midiFromPitch(openString);
    const frets: Note[] = [];
    for (let fret = 0; fret <= numFrets; fret += 1) {
      frets.push(noteFromMidi(openMidi + fret));
    }
    return frets;
  });
}

/**
 * Every position where a pitch class appears on the fretboard.
 * Matches by pitch class, so all octaves of the note are returned.
 */
export function findNoteOnFretboard(
  note: NoteName,
  tuning: string[],
  numFrets: number,
): FretPosition[] {
  const target = chromaOf(note);
  const positions: FretPosition[] = [];
  getFretboardMap(tuning, numFrets).forEach((frets, string) => {
    frets.forEach((fretNote, fret) => {
      if (chromaOf(fretNote.name) === target) {
        positions.push({ string, fret });
      }
    });
  });
  return positions;
}

/**
 * A boolean grid, indexed [string][fret], marking which positions fall on a
 * given scale.
 */
export function scaleShapesOnFretboard(
  scale: Scale,
  tuning: string[],
  numFrets: number,
): boolean[][] {
  return getFretboardMap(tuning, numFrets).map((frets) =>
    frets.map((fretNote) => scaleContainsNote(scale, fretNote.name)),
  );
}

// --- CAGED system -----------------------------------------------------------

type ShapeString = { fret: number; role: "R" | "3" | "5" } | null;

type CagedTemplate = {
  name: CagedShape["shape"];
  /** Pitch class of the root in the shape's open form. */
  openRootChroma: number;
  /** Open-position frets/roles, low string to high; null = unplayed. */
  strings: ShapeString[];
};

/** The five movable CAGED shapes, defined from their open major chords. */
const CAGED_TEMPLATES: CagedTemplate[] = [
  {
    name: "C",
    openRootChroma: 0,
    strings: [
      null,
      { fret: 3, role: "R" },
      { fret: 2, role: "3" },
      { fret: 0, role: "5" },
      { fret: 1, role: "R" },
      { fret: 0, role: "3" },
    ],
  },
  {
    name: "A",
    openRootChroma: 9,
    strings: [
      null,
      { fret: 0, role: "R" },
      { fret: 2, role: "5" },
      { fret: 2, role: "R" },
      { fret: 2, role: "3" },
      { fret: 0, role: "5" },
    ],
  },
  {
    name: "G",
    openRootChroma: 7,
    strings: [
      { fret: 3, role: "R" },
      { fret: 2, role: "3" },
      { fret: 0, role: "5" },
      { fret: 0, role: "R" },
      { fret: 0, role: "3" },
      { fret: 3, role: "R" },
    ],
  },
  {
    name: "E",
    openRootChroma: 4,
    strings: [
      { fret: 0, role: "R" },
      { fret: 2, role: "5" },
      { fret: 2, role: "R" },
      { fret: 1, role: "3" },
      { fret: 0, role: "5" },
      { fret: 0, role: "R" },
    ],
  },
  {
    name: "D",
    openRootChroma: 2,
    strings: [
      null,
      null,
      { fret: 0, role: "R" },
      { fret: 2, role: "5" },
      { fret: 3, role: "R" },
      { fret: 2, role: "3" },
    ],
  },
];

/**
 * The five CAGED shapes for a major or minor triad, transposed so each
 * shape's root note matches the chord root. Minor chords lower the third by
 * a semitone. Throws for non-triad qualities.
 */
export function getCAGEDShapes(chord: Chord): CagedShape[] {
  if (chord.quality !== "major" && chord.quality !== "minor") {
    throw new Error(
      `getCAGEDShapes supports major and minor triads, got "${chord.quality}"`,
    );
  }
  const isMinor = chord.quality === "minor";
  const rootChroma = chromaOf(chord.root);

  return CAGED_TEMPLATES.map((template) => {
    const offset = (((rootChroma - template.openRootChroma) % 12) + 12) % 12;
    const positions: FingeredPosition[] = [];

    template.strings.forEach((shapeString, string) => {
      if (!shapeString) return;
      const lowered = isMinor && shapeString.role === "3" ? -1 : 0;
      let fret = shapeString.fret + lowered + offset;
      while (fret < 0) fret += 12;
      positions.push({ string, fret });
    });

    return { shape: template.name, positions };
  });
}
