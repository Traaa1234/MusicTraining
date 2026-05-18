// Per-exercise configuration for the ear-training module.
//
// Each ExerciseConfig is self-contained: it knows its answer options, how to
// generate a question, how to play it, and how to play a wrong-vs-right
// comparison. The shared ExerciseShell drives all three kinds through this
// uniform interface, so music-theory and audio code lives here, not in the UI.
import type { ChordQuality, ScaleType } from "@/types/music";
import { playChord, playNotes, playScale } from "@/lib/audio/playback";
import { buildChord } from "@/lib/music/chords";
import { noteFromMidi } from "@/lib/music/notes";
import { buildScale } from "@/lib/music/scales";
import type {
  ExerciseKind,
  ExerciseSettings,
} from "@/lib/store/training-store";

export interface AnswerOption {
  id: string;
  label: string;
  /** Level at which this answer becomes available. */
  unlockLevel: number;
}

/** Opaque per-question payload — only the matching config understands it. */
export type Exercise = object;

export interface ExerciseConfig {
  kind: ExerciseKind;
  title: string;
  tagline: string;
  instruction: string;
  answers: AnswerOption[];
  hasDirection: boolean;
  hasArpeggio: boolean;
  generate: (
    level: number,
    settings: ExerciseSettings,
    index: number,
  ) => Exercise;
  /** Builds an exercise whose correct answer is exactly `answerId`. */
  generateFor: (answerId: string, settings: ExerciseSettings) => Exercise;
  answerIdOf: (exercise: Exercise) => string;
  promptLabelOf: (exercise: Exercise) => string;
  play: (exercise: Exercise) => Promise<void>;
  playComparison: (exercise: Exercise, wrongId: string) => Promise<void>;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function pickRoot(settings: ExerciseSettings, index: number): number {
  if (settings.rootMode === "fixed") return 60; // C4
  if (settings.rootMode === "chromatic") return 60 + (index % 12);
  return 55 + Math.floor(Math.random() * 13); // random, G3–G4
}

function unlocked(answers: AnswerOption[], level: number): AnswerOption[] {
  return answers.filter((answer) => answer.unlockLevel <= level);
}

function randomFrom<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function labelOf(answers: AnswerOption[], id: string): string {
  return answers.find((answer) => answer.id === id)?.label ?? id;
}

// --- intervals --------------------------------------------------------------

interface IntervalExercise {
  semitones: number;
  rootMidi: number;
  direction: "ascending" | "descending" | "harmonic";
}

const INTERVAL_ANSWERS: AnswerOption[] = [
  { id: "1", label: "Minor 2nd", unlockLevel: 3 },
  { id: "2", label: "Major 2nd", unlockLevel: 3 },
  { id: "3", label: "Minor 3rd", unlockLevel: 2 },
  { id: "4", label: "Major 3rd", unlockLevel: 2 },
  { id: "5", label: "Perfect 4th", unlockLevel: 3 },
  { id: "6", label: "Tritone", unlockLevel: 6 },
  { id: "7", label: "Perfect 5th", unlockLevel: 1 },
  { id: "8", label: "Minor 6th", unlockLevel: 4 },
  { id: "9", label: "Major 6th", unlockLevel: 4 },
  { id: "10", label: "Minor 7th", unlockLevel: 5 },
  { id: "11", label: "Major 7th", unlockLevel: 5 },
  { id: "12", label: "Perfect Octave", unlockLevel: 1 },
];

function playInterval(exercise: IntervalExercise): Promise<void> {
  const low = noteFromMidi(exercise.rootMidi);
  const high = noteFromMidi(exercise.rootMidi + exercise.semitones);
  if (exercise.direction === "harmonic") {
    return playNotes([low, high], { gap: 0, duration: 1.5 });
  }
  const ordered =
    exercise.direction === "descending" ? [high, low] : [low, high];
  return playNotes(ordered, { gap: 0.62, duration: 0.72 });
}

export const intervalConfig: ExerciseConfig = {
  kind: "intervals",
  title: "Interval Training",
  tagline: "Identify the distance between two notes.",
  instruction: "Listen, then pick the interval you heard.",
  answers: INTERVAL_ANSWERS,
  hasDirection: true,
  hasArpeggio: false,
  generate: (level, settings, index) => {
    const pick = randomFrom(unlocked(INTERVAL_ANSWERS, level));
    const direction =
      settings.direction === "mixed"
        ? randomFrom(["ascending", "descending", "harmonic"] as const)
        : settings.direction;
    const exercise: IntervalExercise = {
      semitones: Number(pick.id),
      rootMidi: pickRoot(settings, index),
      direction,
    };
    return exercise;
  },
  generateFor: (answerId, settings) => {
    const direction =
      settings.direction === "mixed"
        ? randomFrom(["ascending", "descending", "harmonic"] as const)
        : settings.direction;
    const exercise: IntervalExercise = {
      semitones: Number(answerId),
      rootMidi: pickRoot(settings, Math.floor(Math.random() * 12)),
      direction,
    };
    return exercise;
  },
  answerIdOf: (exercise) =>
    String((exercise as IntervalExercise).semitones),
  promptLabelOf: (exercise) =>
    labelOf(INTERVAL_ANSWERS, String((exercise as IntervalExercise).semitones)),
  play: (exercise) => playInterval(exercise as IntervalExercise),
  playComparison: async (exercise, wrongId) => {
    const correct = exercise as IntervalExercise;
    await playInterval({ ...correct, semitones: Number(wrongId) });
    await wait(450);
    await playInterval(correct);
  },
};

// --- chords -----------------------------------------------------------------

interface ChordExercise {
  quality: ChordQuality;
  rootMidi: number;
  arpeggiated: boolean;
}

const CHORD_ANSWERS: AnswerOption[] = [
  { id: "major", label: "Major", unlockLevel: 1 },
  { id: "minor", label: "Minor", unlockLevel: 1 },
  { id: "diminished", label: "Diminished", unlockLevel: 2 },
  { id: "augmented", label: "Augmented", unlockLevel: 2 },
  { id: "major7", label: "Major 7th", unlockLevel: 3 },
  { id: "minor7", label: "Minor 7th", unlockLevel: 3 },
  { id: "dominant7", label: "Dominant 7th", unlockLevel: 3 },
  { id: "minor7b5", label: "Half-Dim (m7♭5)", unlockLevel: 4 },
  { id: "diminished7", label: "Diminished 7th", unlockLevel: 4 },
];

function playChordExercise(exercise: ChordExercise): Promise<void> {
  const root = noteFromMidi(exercise.rootMidi).name;
  return playChord(buildChord(root, exercise.quality), 1.6, exercise.arpeggiated);
}

export const chordConfig: ExerciseConfig = {
  kind: "chords",
  title: "Chord Training",
  tagline: "Identify the quality of a chord.",
  instruction: "Listen, then pick the chord quality you heard.",
  answers: CHORD_ANSWERS,
  hasDirection: false,
  hasArpeggio: true,
  generate: (level, settings, index) => {
    const pick = randomFrom(unlocked(CHORD_ANSWERS, level));
    const exercise: ChordExercise = {
      quality: pick.id as ChordQuality,
      rootMidi: pickRoot(settings, index),
      arpeggiated: settings.arpeggiated,
    };
    return exercise;
  },
  generateFor: (answerId, settings) => {
    const exercise: ChordExercise = {
      quality: answerId as ChordQuality,
      rootMidi: pickRoot(settings, Math.floor(Math.random() * 12)),
      arpeggiated: settings.arpeggiated,
    };
    return exercise;
  },
  answerIdOf: (exercise) => (exercise as ChordExercise).quality,
  promptLabelOf: (exercise) =>
    labelOf(CHORD_ANSWERS, (exercise as ChordExercise).quality),
  play: (exercise) => playChordExercise(exercise as ChordExercise),
  playComparison: async (exercise, wrongId) => {
    const correct = exercise as ChordExercise;
    await playChordExercise({ ...correct, quality: wrongId as ChordQuality });
    await wait(450);
    await playChordExercise(correct);
  },
};

// --- scales -----------------------------------------------------------------

interface ScaleExercise {
  scaleType: ScaleType;
  rootMidi: number;
}

const SCALE_ANSWERS: AnswerOption[] = [
  { id: "major", label: "Major", unlockLevel: 1 },
  { id: "natural-minor", label: "Natural Minor", unlockLevel: 1 },
  { id: "major-pentatonic", label: "Major Pentatonic", unlockLevel: 2 },
  { id: "minor-pentatonic", label: "Minor Pentatonic", unlockLevel: 2 },
  { id: "dorian", label: "Dorian", unlockLevel: 3 },
  { id: "mixolydian", label: "Mixolydian", unlockLevel: 3 },
  { id: "blues", label: "Blues", unlockLevel: 4 },
];

function playScaleExercise(exercise: ScaleExercise): Promise<void> {
  const root = noteFromMidi(exercise.rootMidi).name;
  return playScale(buildScale(root, exercise.scaleType), 1, 168);
}

export const scaleConfig: ExerciseConfig = {
  kind: "scales",
  title: "Scale Training",
  tagline: "Identify a scale by its sound.",
  instruction: "Listen to the scale ascending, then pick what it was.",
  answers: SCALE_ANSWERS,
  hasDirection: false,
  hasArpeggio: false,
  generate: (level, settings, index) => {
    const pick = randomFrom(unlocked(SCALE_ANSWERS, level));
    const exercise: ScaleExercise = {
      scaleType: pick.id as ScaleType,
      rootMidi: pickRoot(settings, index),
    };
    return exercise;
  },
  generateFor: (answerId, settings) => {
    const exercise: ScaleExercise = {
      scaleType: answerId as ScaleType,
      rootMidi: pickRoot(settings, Math.floor(Math.random() * 12)),
    };
    return exercise;
  },
  answerIdOf: (exercise) => (exercise as ScaleExercise).scaleType,
  promptLabelOf: (exercise) =>
    labelOf(SCALE_ANSWERS, (exercise as ScaleExercise).scaleType),
  play: (exercise) => playScaleExercise(exercise as ScaleExercise),
  playComparison: async (exercise, wrongId) => {
    const correct = exercise as ScaleExercise;
    await playScaleExercise({ ...correct, scaleType: wrongId as ScaleType });
    await wait(450);
    await playScaleExercise(correct);
  },
};

export const CONFIGS: Record<ExerciseKind, ExerciseConfig> = {
  intervals: intervalConfig,
  chords: chordConfig,
  scales: scaleConfig,
};
