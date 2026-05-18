import { describe, expect, it } from "vitest";
import {
  enharmonicEquivalent,
  frequencyFromMidi,
  midiFromNote,
  midiFromPitch,
  noteFromMidi,
  normalizeNoteName,
  parsePitch,
} from "@/lib/music/notes";

describe("noteFromMidi", () => {
  it("builds C4 from MIDI 60", () => {
    expect(noteFromMidi(60)).toMatchObject({ name: "C", octave: 4, midi: 60 });
  });

  it("builds A4 from MIDI 69", () => {
    expect(noteFromMidi(69)).toMatchObject({ name: "A", octave: 4, midi: 69 });
  });

  it("rejects non-integer MIDI numbers", () => {
    expect(() => noteFromMidi(60.5)).toThrow();
  });
});

describe("midiFromNote", () => {
  it("maps C4 to 60 and A4 to 69", () => {
    expect(midiFromNote("C", 4)).toBe(60);
    expect(midiFromNote("A", 4)).toBe(69);
  });

  it("round-trips with noteFromMidi", () => {
    for (let midi = 21; midi <= 108; midi += 1) {
      const note = noteFromMidi(midi);
      expect(midiFromNote(note.name, note.octave)).toBe(midi);
    }
  });
});

describe("frequencyFromMidi", () => {
  it("returns 440 Hz for A4", () => {
    expect(frequencyFromMidi(69)).toBeCloseTo(440, 5);
  });

  it("returns 220 Hz for A3", () => {
    expect(frequencyFromMidi(57)).toBeCloseTo(220, 5);
  });
});

describe("enharmonicEquivalent", () => {
  it("swaps C# and Db", () => {
    expect(enharmonicEquivalent("C#")).toBe("Db");
    expect(enharmonicEquivalent("Db")).toBe("C#");
  });

  it("leaves naturals unchanged", () => {
    expect(enharmonicEquivalent("C")).toBe("C");
    expect(enharmonicEquivalent("E")).toBe("E");
  });
});

describe("normalizeNoteName", () => {
  it("accepts lowercase and spelled-out accidentals", () => {
    expect(normalizeNoteName("c#")).toBe("C#");
    expect(normalizeNoteName("C sharp")).toBe("C#");
    expect(normalizeNoteName("Db")).toBe("Db");
    expect(normalizeNoteName("e♭")).toBe("Eb");
    expect(normalizeNoteName("  g  ")).toBe("G");
  });

  it("throws on garbage input", () => {
    expect(() => normalizeNoteName("H")).toThrow();
  });
});

describe("pitch parsing", () => {
  it("parses pitch strings", () => {
    expect(parsePitch("E2")).toEqual({ name: "E", octave: 2 });
    expect(midiFromPitch("E2")).toBe(40);
    expect(midiFromPitch("E4")).toBe(64);
  });
});
