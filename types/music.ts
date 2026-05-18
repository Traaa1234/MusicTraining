// Core music-theory types for Ear Train.
// These describe pure data shapes — no audio or UI concerns.

/** All practical note spellings: 7 naturals + 5 sharps + 5 flats. */
export type NoteName =
  | "C"
  | "C#"
  | "Db"
  | "D"
  | "D#"
  | "Eb"
  | "E"
  | "F"
  | "F#"
  | "Gb"
  | "G"
  | "G#"
  | "Ab"
  | "A"
  | "A#"
  | "Bb"
  | "B";

/** A concrete pitch: a note name at an octave, with derived MIDI + frequency. */
export type Note = {
  name: NoteName;
  octave: number;
  midi: number;
  freq: number;
};

/** Interval quality: Perfect, Major, minor, Augmented, diminished. */
export type IntervalQuality = "P" | "M" | "m" | "A" | "d";

export type Interval = {
  semitones: number;
  name: string;
  quality: IntervalQuality;
};

export type ScaleType =
  | "major"
  | "natural-minor"
  | "harmonic-minor"
  | "melodic-minor"
  | "major-pentatonic"
  | "minor-pentatonic"
  | "blues"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian";

export type Scale = {
  tonic: NoteName;
  type: ScaleType;
  notes: NoteName[];
  /** Semitone offsets from the tonic. */
  intervals: number[];
};

export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "major7"
  | "minor7"
  | "dominant7"
  | "minor7b5"
  | "diminished7"
  | "major6"
  | "minor6"
  | "add9";

export type Chord = {
  root: NoteName;
  quality: ChordQuality;
  notes: NoteName[];
  /** Display symbol, e.g. "Cmaj7", "Am". */
  symbol: string;
};

export type KeyMode = "major" | "minor";

export type Key = {
  tonic: NoteName;
  mode: KeyMode;
};
