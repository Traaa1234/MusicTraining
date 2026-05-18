import { describe, expect, it } from "vitest";
import {
  SCALE_FORMULAS,
  buildScale,
  getModesOf,
  getScaleDegree,
  scaleContainsNote,
} from "@/lib/music/scales";

describe("SCALE_FORMULAS", () => {
  it("every formula spans exactly one octave", () => {
    for (const formula of Object.values(SCALE_FORMULAS)) {
      expect(formula.reduce((a, b) => a + b, 0)).toBe(12);
    }
  });
});

describe("buildScale", () => {
  it("builds the C major scale", () => {
    expect(buildScale("C", "major").notes).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
  });

  it("builds the A minor pentatonic scale", () => {
    expect(buildScale("A", "minor-pentatonic").notes).toEqual([
      "A",
      "C",
      "D",
      "E",
      "G",
    ]);
  });

  it("builds the G major scale with an F#", () => {
    expect(buildScale("G", "major").notes).toEqual([
      "G",
      "A",
      "B",
      "C",
      "D",
      "E",
      "F#",
    ]);
  });
});

describe("getScaleDegree", () => {
  it("is 1-indexed", () => {
    const scale = buildScale("C", "major");
    expect(getScaleDegree(scale, 1)).toBe("C");
    expect(getScaleDegree(scale, 5)).toBe("G");
  });

  it("wraps degrees beyond the scale length", () => {
    expect(getScaleDegree(buildScale("C", "major"), 8)).toBe("C");
  });
});

describe("scaleContainsNote", () => {
  it("detects membership by pitch class", () => {
    const scale = buildScale("C", "major");
    expect(scaleContainsNote(scale, "E")).toBe(true);
    expect(scaleContainsNote(scale, "F#")).toBe(false);
  });
});

describe("getModesOf", () => {
  it("returns the 7 modes of the major scale", () => {
    const modes = getModesOf("C");
    expect(modes).toHaveLength(7);
    expect(modes[0]).toMatchObject({ tonic: "C", type: "major" });
    expect(modes[1]).toMatchObject({ tonic: "D", type: "dorian" });
    expect(modes[5]).toMatchObject({ tonic: "A", type: "natural-minor" });
  });
});
