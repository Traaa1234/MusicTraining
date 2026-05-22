# Guitar Chord Diagrams — Design

**Date:** 2026-05-22
**Status:** Approved

## Goal

Add guitar chord finger patterns ("chord diagrams") to the app. Comprehensive
coverage: every chord type × every root, including idiomatic open shapes and
movable barre shapes. The feature has three surfaces:

1. A `<ChordDiagram>` MDX component, embeddable in lessons.
2. A `/tools/chords` library page for browsing the whole catalogue.
3. Embedded diagrams in selected existing guitar and chord lessons.

## Approach

**Template-based generation.** Store a small set of *movable shape templates*
(the CAGED barre shapes per chord type) plus *open-chord exceptions* for the
idiomatic open shapes. Resolve any `(root, quality)` to one or more shapes by
looking up the open exception (if any) and sliding the matching templates to
the right fret.

Rejected alternatives:

- **Fully hand-curated library** — 100+ entries minimum to write by hand; hard
  to extend with new chord types. The template approach reaches the same
  coverage with ~50 entries.
- **Algorithmic search** — searching all playable fingerings and ranking them
  by ergonomic heuristics is hard to tune and risks awkward, non-idiomatic
  results.

## Architecture

### Data + resolver — `lib/music/chord-shapes.ts`

```ts
interface ChordShape {
  // 6 strings, low E first. null = muted (×), 0 = open (O), >=1 = fret.
  positions: (number | null)[];
  // Parallel to positions. 1=index … 4=pinky. null where positions is null/0.
  fingers: (number | null)[];
  // Optional barre line.
  barre?: { fret: number; fromString: number; toString: number };
  // Fret at the top of the diagram (1 unless the shape lives above the nut).
  baseFret: number;
  name: string; // "open" | "E-shape barre" | "A-shape barre" | ...
}

interface ChordShapeTemplate {
  quality: ChordQuality;
  rootString: 0 | 1; // 0 = low E (E-shape), 1 = A string (A-shape)
  positions: (number | null)[];   // offsets from the root fret
  fingers: (number | null)[];
  barre?: { offset: number; fromString: number; toString: number };
  name: string;
}

export const OPEN_SHAPES: Record<string, ChordShape>;   // ~30 entries
export const SHAPE_TEMPLATES: ChordShapeTemplate[];     // ~20 entries

export function getChordShapes(
  root: NoteName,
  quality: ChordQuality,
): ChordShape[];
```

**Resolver logic:**

1. If `OPEN_SHAPES["{root}_{quality}"]` exists, push it first.
2. For each template matching `quality`, compute the fret distance from the
   open string on `rootString` up to `root`; that becomes `baseFret`. Build a
   `ChordShape` by adding `baseFret` to each non-null offset, copying fingers,
   adjusting any barre. Push it.
3. Return all matching shapes (1–3 per chord typically).

**Quality coverage:**
`major, minor, dominant7, major7, minor7, minor7b5, diminished, diminished7,
augmented, sus2, sus4`. Each gets at least an E-shape template; most also get
an A-shape. Plus the ~30 idiomatic open chords. Total ~50 hand-written
entries.

### Renderer — `components/music/ChordDiagram.tsx`

Self-contained SVG, vertical orientation (universal chord-chart format):

- A grid: 6 strings as vertical lines, 4–5 frets as horizontal lines. Height
  adapts to the shape's fret span.
- Above the nut, per string: `O` (open), `×` (muted), or blank (fretted).
- Inside the grid: filled dot at each fretted position, finger number 1–4
  drawn inside the dot in white.
- Barre: a rounded rectangle laid horizontally across the spanned strings,
  behind the finger dots.
- Fret offset label (e.g. "5fr") next to the top fret when `baseFret > 1`.
- String labels below: `E A D G B e`.
- Whole SVG clickable — plays the chord via existing `playChord(buildChord(
  root, quality), 1.2)`. Subtle hover state signals interactivity.

**Props:**

```ts
interface ChordDiagramProps {
  shape: ChordShape;
  root: NoteName;
  quality: ChordQuality;
  label?: string;
  width?: number;
  className?: string;
}
```

Knows nothing about the shape library. Pure presentational.

### MDX embed — `components/learn/mdx-embeds.tsx`

```tsx
export function MdxChordDiagram({
  chord,
  shape = 0,
}: { chord: string; shape?: number }) {
  const { root, quality } = parseChordSpec(chord);
  const shapes = getChordShapes(root, quality);
  const picked = shapes[shape] ?? shapes[0];
  return (
    <div className="my-5 inline-block rounded-lg border bg-card p-3 align-top">
      <ChordDiagram shape={picked} root={root} quality={quality} label={chord} />
    </div>
  );
}
```

Wire as `<ChordDiagram>` in `mdx-components.tsx` alongside the existing
embed components.

Usage in MDX:

```mdx
<ChordDiagram chord="C major" />
<ChordDiagram chord="F major" />            {/* E-shape barre fallback */}
<ChordDiagram chord="F major" shape={1} />  {/* A-shape barre alternative */}
```

### Library page — `app/tools/chords/page.tsx`

Static page, no server work. Same shape as `/tools/scales` and
`/tools/circle-of-fifths`.

**Layout:**

- Row of 12 root buttons (`C, C♯, D, D♯, E, F, F♯, G, G♯, A, A♯, B`), one
  selected at a time.
- List of quality buttons (`major, minor, 7, maj7, m7, m7♭5, dim, dim7, aug,
  sus2, sus4`), one selected at a time.
- Main area: every shape returned by `getChordShapes(root, quality)` rendered
  as a `<ChordDiagram>` in a responsive grid. Each diagram is clickable to
  hear.

**State:** `useState` for root and quality. URL state via `?root=C&quality=
major` so links are shareable — read on mount, write on change.

**Index card:** Add a "Chord Library" card to the `/tools` index page next
to the existing Scales, Circle of Fifths, Tuner and Chord Progression Builder
cards.

## Lesson integration

Embed diagrams only where they add pedagogical value the surrounding text
cannot. Concrete touchpoints:

| Lesson | What to add |
| --- | --- |
| Guitar Techniques › The CAGED System | All 5 CAGED open shapes (C, A, G, E, D) as ChordDiagrams. Replaces the lone `<Fretboard chord="C major" />` currently shown. |
| Guitar Techniques › Pentatonic Boxes | One ChordDiagram of the parent open chord per box discussion. |
| Chords › Triads | C major (open) and A minor (open) diagrams next to the existing chord PlayButtons. |
| Chords › Seventh Chords | Diagrams for Cmaj7, C7, Cm7 in their idiomatic open forms. |
| Progressions › Pop Progressions | Diagrams of the four chords of I–V–vi–IV (C, G, Am, F) so the learner can play along. |

Five lessons touched, ~15 diagrams embedded.

## Testing

The only thing that can silently be wrong is the resolver: picking the right
`baseFret`, shape, and finger numbers for an arbitrary `(root, quality)`.

Unit tests in `lib/music/__tests__/chord-shapes.test.ts`:

- For each `OPEN_SHAPES` entry: `getChordShapes(root, quality)[0]` returns it,
  and its sounded notes (positions + standard tuning) match the pitch-class
  set of `buildChord(root, quality)`.
- For each template: resolving a non-open root (e.g. `("F", "major")`)
  produces a barre shape with the right `baseFret` and sounded notes matching
  the chord.
- Property test: for every `(root, quality)` combination, every returned
  shape's sounded pitch-class set equals `buildChord(root, quality)`'s. Catches
  any data-entry error in the templates.

`npm run build` covers MDX compilation, the new tool page, and TypeScript.

No snapshot or visual tests at this stage — the chord-diagram visual is a
standardised format with no design ambiguity.

## File summary

| Piece | Path |
| --- | --- |
| Data + resolver | `lib/music/chord-shapes.ts` |
| Renderer | `components/music/ChordDiagram.tsx` |
| MDX embed | `components/learn/mdx-embeds.tsx` (extend), `mdx-components.tsx` (wire) |
| Library page | `app/tools/chords/page.tsx`, `app/tools/page.tsx` (add card) |
| Lesson updates | 5 existing MDX lessons (see Lesson Integration table) |
| Tests | `lib/music/__tests__/chord-shapes.test.ts` |
