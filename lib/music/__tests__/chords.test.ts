import { describe, expect, it } from "vitest";
import {
  buildChord,
  chordFromNotes,
  chordSymbol,
  diatonicChords,
} from "@/lib/music/chords";
import { buildScale } from "@/lib/music/scales";

describe("buildChord", () => {
  it("builds a G dominant 7th = [G, B, D, F]", () => {
    expect(buildChord("G", "dominant7").notes).toEqual(["G", "B", "D", "F"]);
  });

  it("builds a C major triad", () => {
    expect(buildChord("C", "major").notes).toEqual(["C", "E", "G"]);
  });

  it("builds an A minor triad", () => {
    expect(buildChord("A", "minor").notes).toEqual(["A", "C", "E"]);
  });
});

describe("chordSymbol", () => {
  it("formats common chord symbols", () => {
    expect(chordSymbol(buildChord("C", "major"))).toBe("C");
    expect(chordSymbol(buildChord("D", "minor"))).toBe("Dm");
    expect(chordSymbol(buildChord("G", "dominant7"))).toBe("G7");
    expect(chordSymbol(buildChord("C", "major7"))).toBe("Cmaj7");
  });
});

describe("chordFromNotes", () => {
  it("identifies G7 from its notes", () => {
    const chord = chordFromNotes(["G", "B", "D", "F"]);
    expect(chord).toMatchObject({ root: "G", quality: "dominant7" });
  });

  it("identifies a C major triad", () => {
    expect(chordFromNotes(["C", "E", "G"])).toMatchObject({
      root: "C",
      quality: "major",
    });
  });

  it("returns null when there are too few notes", () => {
    expect(chordFromNotes(["C", "D"])).toBeNull();
  });
});

describe("diatonicChords", () => {
  it("derives I ii iii IV V vi vii° for C major", () => {
    const chords = diatonicChords(buildScale("C", "major"));
    expect(chords.map((c) => c.root)).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
    expect(chords.map((c) => c.quality)).toEqual([
      "major",
      "minor",
      "minor",
      "major",
      "major",
      "minor",
      "diminished",
    ]);
  });

  it("throws for non-7-note scales", () => {
    expect(() => diatonicChords(buildScale("A", "minor-pentatonic"))).toThrow();
  });
});
