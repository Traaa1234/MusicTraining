// Guitar chord-shape data and resolver. Given a chord (root + quality),
// returns one or more playable fingerings — open shapes first, then movable
// barre templates slid to the right fret.
import type { ChordQuality, NoteName } from "@/types/music";
import { chromaOf } from "@/lib/music/notes";

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

/** Open-string chroma per string index (low E to high E). */
const OPEN_STRING_CHROMA = [4, 9, 2, 7, 11, 4];

const OPEN_SHAPES: Record<string, ChordShape> = {
  // ---- majors ----
  C_major: {
    positions: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
    baseFret: 1,
    name: "open",
  },
  A_major: {
    positions: [null, 0, 2, 2, 2, 0],
    fingers: [null, null, 1, 2, 3, null],
    baseFret: 1,
    name: "open",
  },
  G_major: {
    positions: [3, 2, 0, 0, 0, 3],
    fingers: [3, 2, null, null, null, 4],
    baseFret: 1,
    name: "open",
  },
  E_major: {
    positions: [0, 2, 2, 1, 0, 0],
    fingers: [null, 2, 3, 1, null, null],
    baseFret: 1,
    name: "open",
  },
  D_major: {
    positions: [null, null, 0, 2, 3, 2],
    fingers: [null, null, null, 1, 3, 2],
    baseFret: 1,
    name: "open",
  },

  // ---- minors ----
  A_minor: {
    positions: [null, 0, 2, 2, 1, 0],
    fingers: [null, null, 2, 3, 1, null],
    baseFret: 1,
    name: "open",
  },
  D_minor: {
    positions: [null, null, 0, 2, 3, 1],
    fingers: [null, null, null, 2, 3, 1],
    baseFret: 1,
    name: "open",
  },
  E_minor: {
    positions: [0, 2, 2, 0, 0, 0],
    fingers: [null, 2, 3, null, null, null],
    baseFret: 1,
    name: "open",
  },

  // ---- dominant 7ths ----
  A_dominant7: {
    positions: [null, 0, 2, 0, 2, 0],
    fingers: [null, null, 2, null, 3, null],
    baseFret: 1,
    name: "open",
  },
  B_dominant7: {
    positions: [null, 2, 1, 2, 0, 2],
    fingers: [null, 2, 1, 3, null, 4],
    baseFret: 1,
    name: "open",
  },
  C_dominant7: {
    positions: [null, 3, 2, 3, 1, 0],
    fingers: [null, 3, 2, 4, 1, null],
    baseFret: 1,
    name: "open",
  },
  D_dominant7: {
    positions: [null, null, 0, 2, 1, 2],
    fingers: [null, null, null, 2, 1, 3],
    baseFret: 1,
    name: "open",
  },
  E_dominant7: {
    positions: [0, 2, 0, 1, 0, 0],
    fingers: [null, 2, null, 1, null, null],
    baseFret: 1,
    name: "open",
  },
  G_dominant7: {
    positions: [3, 2, 0, 0, 0, 1],
    fingers: [3, 2, null, null, null, 1],
    baseFret: 1,
    name: "open",
  },

  // ---- major 7ths ----
  C_major7: {
    positions: [null, 3, 2, 0, 0, 0],
    fingers: [null, 3, 2, null, null, null],
    baseFret: 1,
    name: "open",
  },
  D_major7: {
    positions: [null, null, 0, 2, 2, 2],
    fingers: [null, null, null, 1, 2, 3],
    baseFret: 1,
    name: "open",
  },
  F_major7: {
    positions: [null, null, 3, 2, 1, 0],
    fingers: [null, null, 3, 2, 1, null],
    baseFret: 1,
    name: "open",
  },
  G_major7: {
    positions: [3, 2, 0, 0, 0, 2],
    fingers: [3, 1, null, null, null, 2],
    baseFret: 1,
    name: "open",
  },
  A_major7: {
    positions: [null, 0, 2, 1, 2, 0],
    fingers: [null, null, 2, 1, 3, null],
    baseFret: 1,
    name: "open",
  },

  // ---- minor 7ths ----
  A_minor7: {
    positions: [null, 0, 2, 0, 1, 0],
    fingers: [null, null, 2, null, 1, null],
    baseFret: 1,
    name: "open",
  },
  D_minor7: {
    positions: [null, null, 0, 2, 1, 1],
    fingers: [null, null, null, 2, 1, 1],
    barre: { fret: 1, fromString: 4, toString: 5 },
    baseFret: 1,
    name: "open",
  },
  E_minor7: {
    positions: [0, 2, 0, 0, 0, 0],
    fingers: [null, 2, null, null, null, null],
    baseFret: 1,
    name: "open",
  },

  // ---- sus2 ----
  A_sus2: {
    positions: [null, 0, 2, 2, 0, 0],
    fingers: [null, null, 1, 2, null, null],
    baseFret: 1,
    name: "open",
  },
  D_sus2: {
    positions: [null, null, 0, 2, 3, 0],
    fingers: [null, null, null, 1, 3, null],
    baseFret: 1,
    name: "open",
  },
  E_sus2: {
    positions: [0, 2, 4, 4, 0, 0],
    fingers: [null, 1, 3, 4, null, null],
    baseFret: 1,
    name: "open",
  },

  // ---- sus4 ----
  A_sus4: {
    positions: [null, 0, 2, 2, 3, 0],
    fingers: [null, null, 1, 2, 4, null],
    baseFret: 1,
    name: "open",
  },
  D_sus4: {
    positions: [null, null, 0, 2, 3, 3],
    fingers: [null, null, null, 1, 2, 3],
    baseFret: 1,
    name: "open",
  },
  E_sus4: {
    positions: [0, 2, 2, 2, 0, 0],
    fingers: [null, 1, 2, 3, null, null],
    baseFret: 1,
    name: "open",
  },
};

const SHAPE_TEMPLATES: ChordShapeTemplate[] = [
  {
    quality: "major",
    rootString: 0,
    positions: [0, 2, 2, 1, 0, 0],
    fingers: [1, 3, 4, 2, 1, 1],
    barre: { offset: 0, fromString: 0, toString: 5 },
    name: "E-shape barre",
  },
  {
    quality: "major",
    rootString: 1,
    positions: [null, 0, 2, 2, 2, 0],
    fingers: [null, 1, 2, 3, 4, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },
];

function applyTemplate(
  tpl: ChordShapeTemplate,
  rootFret: number,
): ChordShape {
  const positions = tpl.positions.map((p) => (p === null ? null : p + rootFret));
  const playedFrets = positions.filter(
    (p): p is number => p !== null && p > 0,
  );
  const hasOpen = positions.some((p) => p === 0);
  const baseFret = hasOpen || playedFrets.length === 0
    ? 1
    : Math.min(...playedFrets);
  return {
    positions,
    fingers: [...tpl.fingers],
    barre: tpl.barre
      ? {
          fret: tpl.barre.offset + rootFret,
          fromString: tpl.barre.fromString,
          toString: tpl.barre.toString,
        }
      : undefined,
    baseFret,
    name: tpl.name,
  };
}

export function getChordShapes(
  root: NoteName,
  quality: ChordQuality,
): ChordShape[] {
  const result: ChordShape[] = [];
  const open = OPEN_SHAPES[`${root}_${quality}`];
  if (open) result.push(open);

  const rootChroma = chromaOf(root);
  for (const tpl of SHAPE_TEMPLATES) {
    if (tpl.quality !== quality) continue;
    const stringChroma = OPEN_STRING_CHROMA[tpl.rootString];
    let rootFret = (((rootChroma - stringChroma) % 12) + 12) % 12;
    // Skip when this template would duplicate the open shape on its own root string.
    if (rootFret === 0 && open) continue;
    // If any resolved position would be negative, shift up an octave so the shape sits above the nut.
    const minOffset = Math.min(
      ...tpl.positions.filter((p): p is number => p !== null),
    );
    if (rootFret + minOffset < 1) rootFret += 12;
    result.push(applyTemplate(tpl, rootFret));
  }
  return result;
}
