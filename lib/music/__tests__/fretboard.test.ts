import { describe, expect, it } from "vitest";
import { buildChord } from "@/lib/music/chords";
import {
  STANDARD_TUNING,
  findNoteOnFretboard,
  getCAGEDShapes,
  getFretboardMap,
  scaleShapesOnFretboard,
} from "@/lib/music/fretboard";
import { buildScale } from "@/lib/music/scales";

describe("STANDARD_TUNING", () => {
  it("is standard 6-string tuning, low to high", () => {
    expect(STANDARD_TUNING).toEqual(["E2", "A2", "D3", "G3", "B3", "E4"]);
  });
});

describe("getFretboardMap", () => {
  it("builds a grid of [string][fret]", () => {
    const map = getFretboardMap(STANDARD_TUNING, 12);
    expect(map).toHaveLength(6);
    expect(map[0]).toHaveLength(13);
    expect(map[0][0]).toMatchObject({ name: "E", octave: 2 });
    expect(map[0][12]).toMatchObject({ name: "E", octave: 3 });
  });
});

describe("findNoteOnFretboard", () => {
  it("finds C4 in at least 3 places on a 15-fret neck", () => {
    const map = getFretboardMap(STANDARD_TUNING, 15);
    const c4 = map.flatMap((frets, string) =>
      frets
        .map((note, fret) => ({ note, string, fret }))
        .filter(({ note }) => note.name === "C" && note.octave === 4),
    );
    expect(c4.length).toBeGreaterThanOrEqual(3);
  });

  it("finds the C pitch class across the neck", () => {
    expect(
      findNoteOnFretboard("C", STANDARD_TUNING, 12).length,
    ).toBeGreaterThan(0);
  });
});

describe("scaleShapesOnFretboard", () => {
  it("marks scale tones on the grid", () => {
    const grid = scaleShapesOnFretboard(
      buildScale("C", "major"),
      STANDARD_TUNING,
      12,
    );
    expect(grid).toHaveLength(6);
    // The open low-E string is an E, which is in C major.
    expect(grid[0][0]).toBe(true);
    // Fret 1 of the low-E string is F, also in C major.
    expect(grid[0][1]).toBe(true);
  });
});

describe("getCAGEDShapes", () => {
  it("returns 5 shapes for a major triad", () => {
    const shapes = getCAGEDShapes(buildChord("C", "major"));
    expect(shapes.map((s) => s.shape)).toEqual(["C", "A", "G", "E", "D"]);
    for (const shape of shapes) {
      expect(shape.positions.length).toBeGreaterThan(0);
      for (const position of shape.positions) {
        expect(position.fret).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("throws for non-triad chord qualities", () => {
    expect(() => getCAGEDShapes(buildChord("G", "dominant7"))).toThrow();
  });
});
