// Ear-training session state, persisted to localStorage.
//
// Each exercise kind (intervals / chords / scales) keeps its own slice:
// a persistent part (level, history, settings) and a per-session part
// (attempts, correct, streak) that is reset whenever an exercise page mounts.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type ExerciseKind = "intervals" | "chords" | "scales";
export type DirectionSetting =
  | "ascending"
  | "descending"
  | "harmonic"
  | "mixed";
export type RootMode = "fixed" | "random" | "chromatic";

export interface ExerciseSettings {
  direction: DirectionSetting;
  rootMode: RootMode;
  arpeggiated: boolean;
}

export interface HistoryEntry {
  promptId: string;
  promptLabel: string;
  answerId: string;
  answerLabel: string;
  correct: boolean;
  timestamp: number;
}

export interface KindState {
  level: number;
  attempts: number;
  correct: number;
  streak: number;
  history: HistoryEntry[];
  /** history.length recorded at the last automatic level-up. */
  lastAdvanceAt: number;
  settings: ExerciseSettings;
}

export const MAX_LEVEL = 10;
const WINDOW = 20;
const ADVANCE_THRESHOLD = 0.9;

function initialKindState(): KindState {
  return {
    level: 1,
    attempts: 0,
    correct: 0,
    streak: 0,
    history: [],
    lastAdvanceAt: 0,
    settings: { direction: "ascending", rootMode: "random", arpeggiated: false },
  };
}

interface TrainingStore {
  intervals: KindState;
  chords: KindState;
  scales: KindState;
  recordAttempt: (kind: ExerciseKind, entry: HistoryEntry) => void;
  setLevel: (kind: ExerciseKind, level: number) => void;
  updateSettings: (
    kind: ExerciseKind,
    patch: Partial<ExerciseSettings>,
  ) => void;
  resetSession: (kind: ExerciseKind) => void;
}

export const useTrainingStore = create<TrainingStore>()(
  persist(
    (set) => ({
      intervals: initialKindState(),
      chords: initialKindState(),
      scales: initialKindState(),

      recordAttempt: (kind, entry) =>
        set((state) => {
          const prev = state[kind];
          const history = [...prev.history, entry];
          let { level, lastAdvanceAt } = prev;

          // Auto-advance once the last 20 attempts hit 90%+ accuracy.
          const recent = history.slice(-WINDOW);
          if (
            recent.length === WINDOW &&
            level < MAX_LEVEL &&
            history.length - lastAdvanceAt >= WINDOW
          ) {
            const accuracy =
              recent.filter((e) => e.correct).length / WINDOW;
            if (accuracy >= ADVANCE_THRESHOLD) {
              level += 1;
              lastAdvanceAt = history.length;
            }
          }

          return {
            [kind]: {
              ...prev,
              history,
              level,
              lastAdvanceAt,
              attempts: prev.attempts + 1,
              correct: prev.correct + (entry.correct ? 1 : 0),
              streak: entry.correct ? prev.streak + 1 : 0,
            },
          } as Partial<TrainingStore>;
        }),

      setLevel: (kind, level) =>
        set((state) => ({
          [kind]: {
            ...state[kind],
            level: Math.min(MAX_LEVEL, Math.max(1, Math.round(level))),
          },
        }) as Partial<TrainingStore>),

      updateSettings: (kind, patch) =>
        set((state) => ({
          [kind]: {
            ...state[kind],
            settings: { ...state[kind].settings, ...patch },
          },
        }) as Partial<TrainingStore>),

      resetSession: (kind) =>
        set((state) => ({
          [kind]: { ...state[kind], attempts: 0, correct: 0, streak: 0 },
        }) as Partial<TrainingStore>),
    }),
    {
      name: "ear-train-training",
      storage: createJSONStorage(() => localStorage),
      // Avoid SSR hydration mismatches — rehydrate explicitly on the client.
      skipHydration: true,
    },
  ),
);
