import { describe, expect, it } from "vitest";
import { getChordShapes } from "@/lib/music/chord-shapes";
import type { ChordQuality, NoteName } from "@/types/music";

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
});
