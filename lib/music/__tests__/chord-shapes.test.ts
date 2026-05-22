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
});
