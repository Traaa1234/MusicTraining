# Guitar Chord Diagrams Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a guitar chord-diagram feature: a `<ChordDiagram>` SVG component, an MDX embed, a `/tools/chords` library page browsing every chord type × every root, and diagrams embedded into five existing lessons.

**Architecture:** Template-based shape resolver in `lib/music/chord-shapes.ts` (hand-written open shapes + movable barre templates). Pure presentational `ChordDiagram.tsx`. Standard MDX embed pattern matching the existing Piano/Fretboard/PlayButton embeds. New tool page mirrors `/tools/scales`.

**Tech Stack:** TypeScript, React 19, Next.js 16 App Router, vitest, SVG. Uses existing helpers `playChord`, `buildChord`, `chromaOf`, `STANDARD_TUNING`.

**Conventions (apply throughout):**
- `positions` and `fingers` are 6-element arrays, indexed low-E (0) to high-E (5) — matches `STANDARD_TUNING` `["E2","A2","D3","G3","B3","E4"]`.
- `positions[i]`: `null` = muted (×), `0` = open (O), `n>=1` = fret n.
- `fingers[i]`: `null` when string is muted or open; otherwise `1`=index, `2`=middle, `3`=ring, `4`=pinky.
- Template `positions` are *offsets* from the chord's root fret. The resolver computes `rootFret` from the root note and the template's `rootString`, then adds it to each non-null offset.

**Files:**
- Create `lib/music/chord-shapes.ts`
- Create `lib/music/__tests__/chord-shapes.test.ts`
- Create `components/music/ChordDiagram.tsx`
- Modify `components/learn/mdx-embeds.tsx`
- Modify `mdx-components.tsx`
- Create `app/tools/chords/page.tsx`
- Modify `app/tools/page.tsx`
- Modify `content/lessons/guitar-techniques/the-caged-system.mdx`
- Modify `content/lessons/guitar-techniques/pentatonic-boxes.mdx`
- Modify `content/lessons/chords/triads.mdx`
- Modify `content/lessons/chords/seventh-chords.mdx`
- Modify `content/lessons/progressions/pop-progressions.mdx`

Run all commands from the project root `C:/Users/elinw/Projects/ear-train` unless noted.

---

### Task 1: Scaffold chord-shapes module with types and first test (TDD)

**Files:**
- Create: `lib/music/chord-shapes.ts`
- Create: `lib/music/__tests__/chord-shapes.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// lib/music/__tests__/chord-shapes.test.ts
import { describe, expect, it } from "vitest";
import { getChordShapes } from "@/lib/music/chord-shapes";

describe("getChordShapes", () => {
  it("returns the open C major shape", () => {
    const shapes = getChordShapes("C", "major");
    expect(shapes.length).toBeGreaterThan(0);
    const open = shapes.find((s) => s.name === "open");
    expect(open).toBeDefined();
    expect(open?.positions).toEqual([null, 3, 2, 0, 1, 0]);
    expect(open?.fingers).toEqual([null, 3, 2, null, 1, null]);
    expect(open?.baseFret).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

```
npm test -- chord-shapes
```

Expected: FAIL with "Cannot find module '@/lib/music/chord-shapes'".

- [ ] **Step 3: Write the minimal implementation**

```ts
// lib/music/chord-shapes.ts
//
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
```

- [ ] **Step 4: Run the test to verify it passes**

```
npm test -- chord-shapes
```

Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add lib/music/chord-shapes.ts lib/music/__tests__/chord-shapes.test.ts
git commit -m "feat(chord-shapes): scaffold module with open C major"
```

---

### Task 2: Add template-based resolution for barre chords (TDD)

**Files:**
- Modify: `lib/music/chord-shapes.ts`
- Modify: `lib/music/__tests__/chord-shapes.test.ts`

- [ ] **Step 1: Append the failing test**

Append inside the existing `describe("getChordShapes", ...)` block:

```ts
it("resolves F major to the E-shape barre at fret 1", () => {
  const shapes = getChordShapes("F", "major");
  const barre = shapes.find((s) => s.name === "E-shape barre");
  expect(barre).toBeDefined();
  expect(barre?.baseFret).toBe(1);
  expect(barre?.positions).toEqual([1, 3, 3, 2, 1, 1]);
  expect(barre?.fingers).toEqual([1, 3, 4, 2, 1, 1]);
  expect(barre?.barre).toEqual({ fret: 1, fromString: 0, toString: 5 });
});

it("resolves B major to the A-shape barre at fret 2", () => {
  const shapes = getChordShapes("B", "major");
  const barre = shapes.find((s) => s.name === "A-shape barre");
  expect(barre).toBeDefined();
  expect(barre?.baseFret).toBe(2);
  expect(barre?.positions).toEqual([null, 2, 4, 4, 4, 2]);
});

it("returns the open shape before any barre shape for C major", () => {
  const shapes = getChordShapes("C", "major");
  expect(shapes[0]?.name).toBe("open");
});
```

- [ ] **Step 2: Run the test — expect FAIL**

```
npm test -- chord-shapes
```

Expected: FAIL (no templates registered yet).

- [ ] **Step 3: Replace the resolver and add the two major templates**

Replace the body of `lib/music/chord-shapes.ts` *below* the `interface` declarations:

```ts
import { chromaOf } from "@/lib/music/notes";

/** Open-string chroma per string index (low E to high E). */
const OPEN_STRING_CHROMA = [4, 9, 2, 7, 11, 4];

const OPEN_SHAPES: Record<string, ChordShape> = {
  C_major: {
    positions: [null, 3, 2, 0, 1, 0],
    fingers: [null, 3, 2, null, 1, null],
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
```

- [ ] **Step 4: Run the tests — expect PASS**

```
npm test -- chord-shapes
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add lib/music/chord-shapes.ts lib/music/__tests__/chord-shapes.test.ts
git commit -m "feat(chord-shapes): add template-based barre resolution"
```

---

### Task 3: Fill out OPEN_SHAPES with the 28 idiomatic open chords

**Files:**
- Modify: `lib/music/chord-shapes.ts`

- [ ] **Step 1: Replace the OPEN_SHAPES constant with the full set**

In `lib/music/chord-shapes.ts`, replace the `OPEN_SHAPES` declaration with:

```ts
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
```

- [ ] **Step 2: Add tests confirming a sample of the new open shapes resolve**

Append in the test file:

```ts
it("returns the open shape for every listed open key", () => {
  const samples: Array<[NoteName, ChordQuality, (number | null)[]]> = [
    ["G", "major", [3, 2, 0, 0, 0, 3]],
    ["E", "minor", [0, 2, 2, 0, 0, 0]],
    ["E", "dominant7", [0, 2, 0, 1, 0, 0]],
    ["A", "minor7", [null, 0, 2, 0, 1, 0]],
    ["D", "sus2", [null, null, 0, 2, 3, 0]],
  ];
  for (const [root, quality, expected] of samples) {
    const open = getChordShapes(root, quality).find((s) => s.name === "open");
    expect(open?.positions, `${root}_${quality}`).toEqual(expected);
  }
});
```

Update the import line at the top of the test file:

```ts
import type { ChordQuality, NoteName } from "@/types/music";
```

- [ ] **Step 3: Run the tests — expect PASS**

```
npm test -- chord-shapes
```

Expected: PASS (5 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/music/chord-shapes.ts lib/music/__tests__/chord-shapes.test.ts
git commit -m "feat(chord-shapes): fill out 28 idiomatic open chords"
```

---

### Task 4: Fill out SHAPE_TEMPLATES with the 16 movable shapes

**Files:**
- Modify: `lib/music/chord-shapes.ts`

- [ ] **Step 1: Replace SHAPE_TEMPLATES with the full set**

In `lib/music/chord-shapes.ts`, replace the `SHAPE_TEMPLATES` declaration with:

```ts
const SHAPE_TEMPLATES: ChordShapeTemplate[] = [
  // ---- major ----
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

  // ---- minor ----
  {
    quality: "minor",
    rootString: 0,
    positions: [0, 2, 2, 0, 0, 0],
    fingers: [1, 3, 4, 1, 1, 1],
    barre: { offset: 0, fromString: 0, toString: 5 },
    name: "E-shape barre",
  },
  {
    quality: "minor",
    rootString: 1,
    positions: [null, 0, 2, 2, 1, 0],
    fingers: [null, 1, 3, 4, 2, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },

  // ---- dominant7 ----
  {
    quality: "dominant7",
    rootString: 0,
    positions: [0, 2, 0, 1, 0, 0],
    fingers: [1, 3, 1, 2, 1, 1],
    barre: { offset: 0, fromString: 0, toString: 5 },
    name: "E-shape barre",
  },
  {
    quality: "dominant7",
    rootString: 1,
    positions: [null, 0, 2, 0, 2, 0],
    fingers: [null, 1, 3, 1, 4, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },

  // ---- major7 ----
  {
    quality: "major7",
    rootString: 0,
    positions: [0, 2, 1, 1, 0, 0],
    fingers: [1, 4, 2, 3, 1, 1],
    barre: { offset: 0, fromString: 0, toString: 5 },
    name: "E-shape barre",
  },
  {
    quality: "major7",
    rootString: 1,
    positions: [null, 0, 2, 1, 2, 0],
    fingers: [null, 1, 3, 2, 4, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },

  // ---- minor7 ----
  {
    quality: "minor7",
    rootString: 0,
    positions: [0, 2, 0, 0, 0, 0],
    fingers: [1, 3, 1, 1, 1, 1],
    barre: { offset: 0, fromString: 0, toString: 5 },
    name: "E-shape barre",
  },
  {
    quality: "minor7",
    rootString: 1,
    positions: [null, 0, 2, 0, 1, 0],
    fingers: [null, 1, 3, 1, 2, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },

  // ---- minor7b5 (half-diminished) ----
  {
    quality: "minor7b5",
    rootString: 1,
    positions: [null, 0, 1, 0, 1, null],
    fingers: [null, 1, 3, 2, 4, null],
    name: "A-shape voicing",
  },

  // ---- diminished triad ----
  {
    quality: "diminished",
    rootString: 1,
    positions: [null, 0, 1, 2, 1, null],
    fingers: [null, 1, 2, 4, 3, null],
    name: "A-shape voicing",
  },

  // ---- diminished7 (B-string root, 4-string voicing) ----
  {
    quality: "diminished7",
    rootString: 4,
    positions: [null, null, 0, 1, 0, 1],
    fingers: [null, null, 1, 3, 2, 4],
    name: "four-string voicing",
  },

  // ---- augmented (low-E root, 4-string) ----
  {
    quality: "augmented",
    rootString: 0,
    positions: [0, 3, 2, 1, null, null],
    fingers: [1, 4, 3, 2, null, null],
    name: "four-string voicing",
  },

  // ---- sus2 ----
  {
    quality: "sus2",
    rootString: 1,
    positions: [null, 0, 2, 2, 0, 0],
    fingers: [null, 1, 3, 4, 1, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },

  // ---- sus4 ----
  {
    quality: "sus4",
    rootString: 1,
    positions: [null, 0, 2, 2, 3, 0],
    fingers: [null, 1, 2, 3, 4, 1],
    barre: { offset: 0, fromString: 1, toString: 5 },
    name: "A-shape barre",
  },
];
```

- [ ] **Step 2: Add a smoke test that exercises a barre at a high fret**

Append in the test file:

```ts
it("resolves G minor7 to the A-shape barre at fret 10", () => {
  const shapes = getChordShapes("G", "minor7");
  const barre = shapes.find((s) => s.name === "A-shape barre");
  expect(barre).toBeDefined();
  expect(barre?.baseFret).toBe(10);
  expect(barre?.positions).toEqual([null, 10, 12, 10, 11, 10]);
});

it("resolves C diminished7 to the four-string voicing", () => {
  const shapes = getChordShapes("C", "diminished7");
  const voicing = shapes.find((s) => s.name === "four-string voicing");
  expect(voicing).toBeDefined();
  expect(voicing?.positions).toEqual([null, null, 1, 2, 1, 2]);
});
```

- [ ] **Step 3: Run the tests — expect PASS**

```
npm test -- chord-shapes
```

Expected: PASS (7 tests).

- [ ] **Step 4: Commit**

```bash
git add lib/music/chord-shapes.ts lib/music/__tests__/chord-shapes.test.ts
git commit -m "feat(chord-shapes): add 16 movable shape templates"
```

---

### Task 5: Add the comprehensive property test — every shape's notes match the chord

**Files:**
- Modify: `lib/music/__tests__/chord-shapes.test.ts`

The point of this test: catch any data-entry error in the open shapes or templates. For every supported `(root, quality)`, every returned shape's sounded pitch-class set must equal `buildChord(root, quality)`'s pitch-class set.

- [ ] **Step 1: Append the property test**

Add these imports at the top of the test file (combine with the existing imports — no duplicate import paths):

```ts
import { buildChord } from "@/lib/music/chords";
import { STANDARD_TUNING } from "@/lib/music/fretboard";
import {
  SHARP_NOTE_NAMES,
  chromaOf,
  midiFromPitch,
} from "@/lib/music/notes";

const QUALITIES: ChordQuality[] = [
  "major",
  "minor",
  "dominant7",
  "major7",
  "minor7",
  "minor7b5",
  "diminished",
  "diminished7",
  "augmented",
  "sus2",
  "sus4",
];

function shapePitchClasses(shape: { positions: (number | null)[] }): Set<number> {
  const set = new Set<number>();
  shape.positions.forEach((fret, string) => {
    if (fret === null) return;
    const open = midiFromPitch(STANDARD_TUNING[string]);
    set.add((open + fret) % 12);
  });
  return set;
}

describe("chord-shape notes match the chord", () => {
  for (const root of SHARP_NOTE_NAMES) {
    for (const quality of QUALITIES) {
      it(`every shape for ${root} ${quality} sounds the right notes`, () => {
        const chord = buildChord(root, quality);
        const expected = new Set(chord.notes.map((n) => chromaOf(n)));
        const shapes = getChordShapes(root, quality);
        expect(shapes.length, `no shapes for ${root} ${quality}`).toBeGreaterThan(0);
        for (const shape of shapes) {
          const got = shapePitchClasses(shape);
          expect(got, `${root} ${quality} / ${shape.name}`).toEqual(expected);
        }
      });
    }
  }
});
```

- [ ] **Step 2: Run the tests**

```
npm test -- chord-shapes
```

Expected: PASS (132 tests — 12 roots × 11 qualities, plus the earlier 7).

If any test fails, the failing `(root, quality, shape.name)` identifies the data entry to fix. Common causes: a finger number mis-typed, a position off by one, the wrong `rootString` on a template. Fix the data in `chord-shapes.ts` and re-run.

- [ ] **Step 3: Commit**

```bash
git add lib/music/__tests__/chord-shapes.test.ts
git commit -m "test(chord-shapes): property test — every shape's notes match its chord"
```

---

### Task 6: Build the `<ChordDiagram>` SVG component

**Files:**
- Create: `components/music/ChordDiagram.tsx`

This is a presentational component. No tests — `npm run build` catches TypeScript and SVG syntax errors; visual correctness is verified manually once the embed is wired (Task 7) or the library page is up (Task 8).

- [ ] **Step 1: Create the component**

```tsx
// components/music/ChordDiagram.tsx
"use client";

// One chord shape, drawn as a standard vertical chord-box diagram.
// Click anywhere on the SVG to hear the chord.
import { useId } from "react";
import type { ChordQuality, NoteName } from "@/types/music";
import { playChord } from "@/lib/audio/playback";
import { buildChord } from "@/lib/music/chords";
import type { ChordShape } from "@/lib/music/chord-shapes";
import { cn } from "@/lib/utils";

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"] as const;
const STRING_COUNT = 6;
const FRET_ROWS = 5;

// SVG geometry (unitless; the SVG scales to its container width).
const STRING_SPACING = 22;
const FRET_HEIGHT = 26;
const PAD_TOP = 28;
const PAD_BOTTOM = 28;
const PAD_LEFT = 26;
const PAD_RIGHT = 26;
const DOT_RADIUS = 9;
const NUT_THICKNESS = 5;

export interface ChordDiagramProps {
  shape: ChordShape;
  root: NoteName;
  quality: ChordQuality;
  label?: string;
  className?: string;
}

export function ChordDiagram({
  shape,
  root,
  quality,
  label,
  className,
}: ChordDiagramProps) {
  const gradId = useId();
  const width = PAD_LEFT + STRING_SPACING * (STRING_COUNT - 1) + PAD_RIGHT;
  const height = PAD_TOP + FRET_HEIGHT * FRET_ROWS + PAD_BOTTOM;
  const showNut = shape.baseFret === 1;
  const stringX = (s: number) => PAD_LEFT + s * STRING_SPACING;
  const fretY = (row: number) => PAD_TOP + row * FRET_HEIGHT;

  const handleClick = () => {
    const chord = buildChord(root, quality);
    void playChord(chord, 1.2);
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn(
        "h-auto w-full max-w-[180px] cursor-pointer select-none transition-opacity hover:opacity-90",
        className,
      )}
      onClick={handleClick}
      role="img"
      aria-label={`${label ?? `${root} ${quality}`} chord diagram`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--card))" />
        </linearGradient>
      </defs>

      {/* label */}
      {label && (
        <text
          x={width / 2}
          y={PAD_TOP - 14}
          textAnchor="middle"
          className="fill-foreground text-[13px] font-semibold"
        >
          {label}
        </text>
      )}

      {/* nut or top fret bar */}
      {showNut ? (
        <rect
          x={stringX(0) - 1}
          y={PAD_TOP - NUT_THICKNESS / 2}
          width={stringX(STRING_COUNT - 1) - stringX(0) + 2}
          height={NUT_THICKNESS}
          fill="hsl(var(--foreground))"
        />
      ) : (
        <>
          <line
            x1={stringX(0)}
            y1={PAD_TOP}
            x2={stringX(STRING_COUNT - 1)}
            y2={PAD_TOP}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
          />
          <text
            x={stringX(STRING_COUNT - 1) + 8}
            y={PAD_TOP + 4}
            className="fill-muted-foreground text-[11px] font-medium"
          >
            {shape.baseFret}fr
          </text>
        </>
      )}

      {/* frets */}
      {Array.from({ length: FRET_ROWS }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={stringX(0)}
          y1={fretY(i + 1)}
          x2={stringX(STRING_COUNT - 1)}
          y2={fretY(i + 1)}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
      ))}

      {/* strings */}
      {Array.from({ length: STRING_COUNT }).map((_, s) => (
        <line
          key={`string-${s}`}
          x1={stringX(s)}
          y1={PAD_TOP}
          x2={stringX(s)}
          y2={PAD_TOP + FRET_HEIGHT * FRET_ROWS}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
      ))}

      {/* string labels at the bottom */}
      {STRING_LABELS.map((name, s) => (
        <text
          key={`label-${s}`}
          x={stringX(s)}
          y={PAD_TOP + FRET_HEIGHT * FRET_ROWS + 16}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-medium"
        >
          {name}
        </text>
      ))}

      {/* O / × markers above the nut */}
      {shape.positions.map((p, s) => {
        if (p === null) {
          return (
            <text
              key={`mute-${s}`}
              x={stringX(s)}
              y={PAD_TOP - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[12px] font-semibold"
            >
              ×
            </text>
          );
        }
        if (p === 0) {
          return (
            <circle
              key={`open-${s}`}
              cx={stringX(s)}
              cy={PAD_TOP - 10}
              r={4}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.2}
            />
          );
        }
        return null;
      })}

      {/* barre */}
      {shape.barre && (() => {
        const row = shape.barre.fret - shape.baseFret;
        const y = fretY(row) + FRET_HEIGHT / 2;
        const x1 = stringX(shape.barre.fromString);
        const x2 = stringX(shape.barre.toString);
        return (
          <rect
            x={x1 - DOT_RADIUS}
            y={y - DOT_RADIUS}
            width={x2 - x1 + DOT_RADIUS * 2}
            height={DOT_RADIUS * 2}
            rx={DOT_RADIUS}
            fill="hsl(var(--primary))"
            opacity={0.85}
          />
        );
      })()}

      {/* finger dots */}
      {shape.positions.map((fret, s) => {
        if (fret === null || fret === 0) return null;
        const row = fret - shape.baseFret;
        const cx = stringX(s);
        const cy = fretY(row) + FRET_HEIGHT / 2;
        const finger = shape.fingers[s];
        return (
          <g key={`dot-${s}`}>
            <circle
              cx={cx}
              cy={cy}
              r={DOT_RADIUS}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
            />
            {finger != null && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-primary-foreground text-[11px] font-bold"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```
npm run build
```

Expected: `✓ Compiled successfully`. No new errors.

- [ ] **Step 3: Commit**

```bash
git add components/music/ChordDiagram.tsx
git commit -m "feat(chord-diagram): SVG chord-box renderer"
```

---

### Task 7: Wire up the MDX embed

**Files:**
- Modify: `components/learn/mdx-embeds.tsx`
- Modify: `mdx-components.tsx`

- [ ] **Step 1: Add the MDX embed wrapper**

At the bottom of `components/learn/mdx-embeds.tsx`, before the final closing of the file, add new imports and the new exported function. The full additions:

Add to the top imports of the file (`ChordQuality` and `NoteName` are already imported from `@/types/music`; don't duplicate them):

```ts
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { getChordShapes } from "@/lib/music/chord-shapes";
```

At the bottom of the file, add:

```tsx
function parseChordSpec(spec: string): { root: NoteName; quality: ChordQuality } {
  const tokens = spec.trim().split(/\s+/);
  const root = normalizeNoteName(tokens[0]);
  const quality = (tokens.slice(1).join("") || "major") as ChordQuality;
  return { root, quality };
}

export function MdxChordDiagram({
  chord,
  shape = 0,
}: {
  chord: string;
  shape?: number;
}) {
  const { root, quality } = parseChordSpec(chord);
  const shapes = getChordShapes(root, quality);
  const picked = shapes[shape] ?? shapes[0];
  if (!picked) return null;
  return (
    <span className="my-3 mr-3 inline-block rounded-lg border bg-card p-3 align-top">
      <ChordDiagram
        shape={picked}
        root={root}
        quality={quality}
        label={chord}
      />
    </span>
  );
}
```

- [ ] **Step 2: Register the embed in `mdx-components.tsx`**

In `mdx-components.tsx`, add `MdxChordDiagram` to the import and to the returned component map.

Update the import:

```ts
import {
  MdxChordDiagram,
  MdxCircleOfFifths,
  MdxFretboard,
  MdxPiano,
  MdxPlayButton,
} from "@/components/learn/mdx-embeds";
```

Add the entry in the returned object (anywhere within it):

```ts
ChordDiagram: MdxChordDiagram,
```

- [ ] **Step 3: Build to verify**

```
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add components/learn/mdx-embeds.tsx mdx-components.tsx
git commit -m "feat(chord-diagram): MDX embed wrapper + register <ChordDiagram>"
```

---

### Task 8: Build the `/tools/chords` library page

**Files:**
- Create: `app/tools/chords/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/tools/chords/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { ChordQuality, NoteName } from "@/types/music";
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { getChordShapes } from "@/lib/music/chord-shapes";
import { SHARP_NOTE_NAMES } from "@/lib/music/notes";
import { cn } from "@/lib/utils";

const QUALITIES: Array<{ value: ChordQuality; label: string }> = [
  { value: "major", label: "major" },
  { value: "minor", label: "minor" },
  { value: "dominant7", label: "7" },
  { value: "major7", label: "maj7" },
  { value: "minor7", label: "m7" },
  { value: "minor7b5", label: "m7♭5" },
  { value: "diminished", label: "dim" },
  { value: "diminished7", label: "dim7" },
  { value: "augmented", label: "aug" },
  { value: "sus2", label: "sus2" },
  { value: "sus4", label: "sus4" },
];

function prettyNote(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

export default function ChordLibraryPage() {
  const [root, setRoot] = useState<NoteName>("C");
  const [quality, setQuality] = useState<ChordQuality>("major");

  // Read URL state on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("root") as NoteName | null;
    const q = params.get("quality") as ChordQuality | null;
    if (r && SHARP_NOTE_NAMES.includes(r)) setRoot(r);
    if (q && QUALITIES.some((opt) => opt.value === q)) setQuality(q);
  }, []);

  // Write URL state on change.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("root", root);
    params.set("quality", quality);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
  }, [root, quality]);

  const shapes = getChordShapes(root, quality);
  const qualityLabel =
    QUALITIES.find((opt) => opt.value === quality)?.label ?? quality;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Chord Library</h1>
      <p className="mt-2 text-muted-foreground">
        Browse every chord. Pick a root and a quality.
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          Root
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {SHARP_NOTE_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRoot(n)}
              className={cn(
                "min-w-[42px] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                root === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {prettyNote(n)}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          Quality
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {QUALITIES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuality(opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                quality === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {prettyNote(root)} {qualityLabel}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Click any diagram to hear the chord.
        </p>
        {shapes.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            No shape available for this chord.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {shapes.map((shape, i) => (
              <div
                key={`${shape.name}-${i}`}
                className="rounded-lg border bg-card p-3 text-center"
              >
                <ChordDiagram
                  shape={shape}
                  root={root}
                  quality={quality}
                  label={`${prettyNote(root)} ${qualityLabel}`}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {shape.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Build to verify**

```
npm run build
```

Expected: `✓ Compiled successfully` and the route `/tools/chords` appears in the build output.

- [ ] **Step 3: Manual smoke check (optional but recommended)**

```
npm run dev
```

Open `http://localhost:3000/tools/chords` in a browser. Pick a few root/quality combos. Confirm diagrams render and clicking plays the chord.

- [ ] **Step 4: Commit**

```bash
git add app/tools/chords/page.tsx
git commit -m "feat(chord-library): /tools/chords page"
```

---

### Task 9: Replace the `/tools` placeholder with a tool-card grid

The current `/tools/page.tsx` is a placeholder. Replace it with a small grid of cards linking to all five tools (Scales, Circle of Fifths, Tuner, Chord Progression Builder, Chord Library).

**Files:**
- Modify: `app/tools/page.tsx`

- [ ] **Step 1: Replace the file**

```tsx
// app/tools/page.tsx
import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/scales",
    title: "Scales",
    description: "Build any scale and see it on the piano and fretboard.",
  },
  {
    href: "/tools/circle-of-fifths",
    title: "Circle of Fifths",
    description: "Interactive circle — click a key to hear it.",
  },
  {
    href: "/tools/chords",
    title: "Chord Library",
    description: "Every chord type × every root, with fingering diagrams.",
  },
  {
    href: "/tools/chord-progression-builder",
    title: "Chord Progression Builder",
    description: "Drag chords into a progression and play it back.",
  },
  {
    href: "/tools/tuner",
    title: "Tuner",
    description: "Real-time pitch detection through your microphone.",
  },
];

export default function ToolsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
      <p className="mt-2 text-muted-foreground">
        Interactive instruments and reference tools.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-lg border bg-card p-5 transition-colors hover:bg-muted"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              {tool.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Build to verify**

```
npm run build
```

Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Commit**

```bash
git add app/tools/page.tsx
git commit -m "feat(tools): replace placeholder index with tool-card grid"
```

---

### Task 10: Embed chord diagrams into five lessons

Five lesson MDX files get diagram embeds. Each edit is a single insert — no existing content is removed.

**Files:**
- Modify: `content/lessons/guitar-techniques/the-caged-system.mdx`
- Modify: `content/lessons/guitar-techniques/pentatonic-boxes.mdx`
- Modify: `content/lessons/chords/triads.mdx`
- Modify: `content/lessons/chords/seventh-chords.mdx`
- Modify: `content/lessons/progressions/pop-progressions.mdx`

- [ ] **Step 1: CAGED system — replace the lone Fretboard with five chord diagrams**

In `content/lessons/guitar-techniques/the-caged-system.mdx`, find this block:

```mdx
<Fretboard chord="C major" />

Going up the neck the shapes always appear in the same cycle — C, A, G, E, D,
then C again — and each one overlaps the next.
```

Replace it with:

```mdx
<ChordDiagram chord="C major" />
<ChordDiagram chord="A major" />
<ChordDiagram chord="G major" />
<ChordDiagram chord="E major" />
<ChordDiagram chord="D major" />

Going up the neck the shapes always appear in the same cycle — C, A, G, E, D,
then C again — and each one overlaps the next.
```

- [ ] **Step 2: Pentatonic Boxes — add a Box 1 anchor diagram**

In `content/lessons/guitar-techniques/pentatonic-boxes.mdx`, find:

```mdx
The most famous shape is **Box 1**. For A minor pentatonic it sits around the
5th fret, and it is compact, symmetrical and easy to memorise — two notes on
every string.
```

After that paragraph, add a blank line and:

```mdx
<ChordDiagram chord="A minor" />
```

This anchors Box 1 to its parent open chord (A minor sits at the bottom of A minor pentatonic Box 1's region in practice; for the lesson we just show A minor as the harmonic anchor).

- [ ] **Step 3: Triads — add open chord diagrams next to the existing PlayButtons**

In `content/lessons/chords/triads.mdx`, find:

```mdx
<PlayButton notes="C4 E4 G4" label="C major triad" chord />

<Fretboard chord="C major" />
```

Replace the `<Fretboard chord="C major" />` line with:

```mdx
<ChordDiagram chord="C major" />
```

Then, find the C minor triad section:

```mdx
<PlayButton notes="C4 Eb4 G4" label="C minor triad" chord />
```

Add after that line, on a new line:

```mdx
<ChordDiagram chord="A minor" />
```

(C minor has no idiomatic open shape, so the lesson points the learner at a related open minor — A minor — to actually fret. The text already discusses minor triads abstractly.)

- [ ] **Step 4: Seventh Chords — embed the three open sevenths**

In `content/lessons/chords/seventh-chords.mdx`, find:

```mdx
<PlayButton notes="C4 E4 G4 B4" label="C major 7 (Cmaj7)" chord />

<Fretboard chord="C major7" />
```

Replace `<Fretboard chord="C major7" />` with:

```mdx
<ChordDiagram chord="C major7" />
```

Then find:

```mdx
<PlayButton notes="C4 E4 G4 Bb4" label="C dominant 7 (C7)" chord />
```

Add after it:

```mdx
<ChordDiagram chord="C dominant7" />
```

Then find:

```mdx
<PlayButton notes="C4 Eb4 G4 Bb4" label="C minor 7 (Cm7)" chord />
```

Add after it:

```mdx
<ChordDiagram chord="A minor7" />
```

(Again — Cm7 has no idiomatic open form; A minor7 is the canonical *open* m7 shape and what a learner would actually grab to feel a minor 7.)

- [ ] **Step 5: Pop Progressions — show the I–V–vi–IV chords**

In `content/lessons/progressions/pop-progressions.mdx`, find:

```mdx
<PlayButton notes="F3 A3 C4" label="IV — F major" chord />
```

After that line, add:

```mdx
<ChordDiagram chord="C major" />
<ChordDiagram chord="G major" />
<ChordDiagram chord="A minor" />
<ChordDiagram chord="F major" />
```

- [ ] **Step 6: Build to verify all MDX compiles**

```
npm run build
```

Expected: `✓ Compiled successfully`. If a build error references a chord that has no resolved shape, double-check the spelling — the `chord` prop syntax is `"<root> <quality>"` where quality matches the `ChordQuality` strings (`major`, `minor`, `dominant7`, `major7`, `minor7`, `minor7b5`, `diminished`, `diminished7`, `augmented`, `sus2`, `sus4`).

- [ ] **Step 7: Commit**

```bash
git add content/lessons/guitar-techniques/the-caged-system.mdx \
        content/lessons/guitar-techniques/pentatonic-boxes.mdx \
        content/lessons/chords/triads.mdx \
        content/lessons/chords/seventh-chords.mdx \
        content/lessons/progressions/pop-progressions.mdx
git commit -m "feat(lessons): embed chord diagrams in 5 lessons"
```

---

### Task 11: Final verification

- [ ] **Step 1: Run the full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run the production build**

```
npm run build
```

Expected: `✓ Compiled successfully`. The build output should list the new route `/learn/.../...` (existing) plus the new `/tools/chords` route.

- [ ] **Step 3: Spot-check in the dev server**

```
npm run dev
```

Visit:
- `http://localhost:3000/tools` — should show 5 tool cards.
- `http://localhost:3000/tools/chords` — try a few combos: `C major` (open + two barres), `F major` (E-shape barre at 1, A-shape barre at 8), `G minor7` (no open, two barres), `C sus2` (one barre via A-shape template at fret 3).
- `http://localhost:3000/learn/guitar-techniques/the-caged-system` — should show the five CAGED diagrams.
- `http://localhost:3000/learn/progressions/pop-progressions` — should show the four I–V–vi–IV diagrams.

Click each diagram and confirm the chord plays.

- [ ] **Step 4: (Optional) push to deploy**

```bash
git push
```

Vercel will redeploy with the new feature.
