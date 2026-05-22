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
