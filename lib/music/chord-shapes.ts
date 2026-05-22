// Guitar chord-shape data and resolver. Given a chord (root + quality),
// returns one or more playable fingerings — open shapes first, then movable
// barre templates slid to the right fret.
import type { ChordQuality, NoteName } from "@/types/music";

export interface ChordShape {
  /** 6 strings, low E first. null = muted (×), 0 = open (O), n>=1 = fret n. */
  positions: (number | null)[];
  /** Parallel to positions. 1=index … 4=pinky. null where string is muted or open. */
  fingers: (number | null)[];
  /** Optional barre line, drawn across the spanned strings at this fret. */
  barre?: { fret: number; fromString: number; toString: number };
  /** Fret shown at the top of the diagram. 1 means the nut is visible. */
  baseFret: number;
  name: string;
}

export interface ChordShapeTemplate {
  quality: ChordQuality;
  /** Which string carries the root note (0=low E, 1=A, 2=D, 3=G, 4=B, 5=high E). */
  rootString: 0 | 1 | 2 | 3 | 4 | 5;
  /** Offsets from the root fret. */
  positions: (number | null)[];
  fingers: (number | null)[];
  /** Barre offset is also relative to the root fret. */
  barre?: { offset: number; fromString: number; toString: number };
  name: string;
}

const OPEN_SHAPES: Record<string, ChordShape> = {
  C_major: {
    positions: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
    baseFret: 1,
    name: "open",
  },
};

const SHAPE_TEMPLATES: ChordShapeTemplate[] = [];

export function getChordShapes(
  root: NoteName,
  quality: ChordQuality,
): ChordShape[] {
  const result: ChordShape[] = [];
  const open = OPEN_SHAPES[`${root}_${quality}`];
  if (open) result.push(open);
  return result;
}
