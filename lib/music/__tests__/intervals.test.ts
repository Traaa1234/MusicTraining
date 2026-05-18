import { describe, expect, it } from "vitest";
import {
  INTERVALS,
  intervalBetween,
  intervalQuality,
  noteAtInterval,
} from "@/lib/music/intervals";
import { noteFromMidi } from "@/lib/music/notes";

describe("INTERVALS", () => {
  it("contains all 13 intervals from P1 to P8", () => {
    expect(INTERVALS).toHaveLength(13);
    expect(INTERVALS[0]).toMatchObject({ semitones: 0, name: "P1" });
    expect(INTERVALS[7]).toMatchObject({ semitones: 7, name: "P5" });
    expect(INTERVALS[12]).toMatchObject({ semitones: 12, name: "P8" });
  });
});

describe("intervalQuality", () => {
  it("classifies common intervals", () => {
    expect(intervalQuality(0)).toBe("P");
    expect(intervalQuality(3)).toBe("m");
    expect(intervalQuality(4)).toBe("M");
    expect(intervalQuality(6)).toBe("A");
    expect(intervalQuality(7)).toBe("P");
  });

  it("octave-reduces large interval counts", () => {
    expect(intervalQuality(19)).toBe("P"); // a 12th reduces to a P5
  });
});

describe("intervalBetween", () => {
  it("identifies a perfect fifth from C4 to G4", () => {
    const interval = intervalBetween(noteFromMidi(60), noteFromMidi(67));
    expect(interval).toEqual({ semitones: 7, name: "P5", quality: "P" });
  });

  it("is direction-independent", () => {
    expect(intervalBetween(noteFromMidi(67), noteFromMidi(60)).semitones).toBe(
      7,
    );
  });
});

describe("noteAtInterval", () => {
  it("transposes a note up by semitones", () => {
    expect(noteAtInterval(noteFromMidi(60), 7).midi).toBe(67);
  });
});
