import { describe, expect, it } from "vitest";
import {
  CIRCLE,
  distanceOnCircle,
  getRelativeMajor,
  getRelativeMinor,
  keySignature,
} from "@/lib/music/circle-of-fifths";
import { chromaOf } from "@/lib/music/notes";

describe("CIRCLE", () => {
  it("lists 12 keys starting from C", () => {
    expect(CIRCLE).toHaveLength(12);
    expect(CIRCLE[0]).toBe("C");
    expect(CIRCLE[1]).toBe("G");
  });
});

describe("relative keys", () => {
  it("relative minor of C is A", () => {
    expect(getRelativeMinor("C")).toBe("A");
  });

  it("relative major of A is C", () => {
    expect(getRelativeMajor("A")).toBe("C");
  });

  it("round-trips by pitch class", () => {
    // Enharmonic spelling may normalize (G# -> Ab), so compare pitch classes.
    for (const key of CIRCLE) {
      expect(chromaOf(getRelativeMajor(getRelativeMinor(key)))).toBe(
        chromaOf(key),
      );
    }
  });
});

describe("distanceOnCircle", () => {
  it("is 1 from C to G", () => {
    expect(distanceOnCircle("C", "G")).toBe(1);
  });

  it("is 0 for the same key", () => {
    expect(distanceOnCircle("C", "C")).toBe(0);
  });

  it("is at most 6", () => {
    expect(distanceOnCircle("C", "F#")).toBe(6);
  });
});

describe("keySignature", () => {
  it("G major has one sharp (F#)", () => {
    expect(keySignature("G", "major")).toEqual({ sharps: ["F#"], flats: [] });
  });

  it("F major has one flat (Bb)", () => {
    expect(keySignature("F", "major")).toEqual({ sharps: [], flats: ["Bb"] });
  });

  it("A minor has no accidentals", () => {
    expect(keySignature("A", "minor")).toEqual({ sharps: [], flats: [] });
  });
});
