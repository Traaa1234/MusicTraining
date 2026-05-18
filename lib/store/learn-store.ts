// Lesson progress, persisted to localStorage.
//
// A lesson counts as complete once the reader has scrolled to the end AND
// scored at least 70% on its quiz. Keyed by `${category}/${slug}`.
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export const PASS_THRESHOLD = 70;

export interface LessonProgress {
  scrolledToEnd: boolean;
  quizBestScore: number;
}

interface LearnStore {
  progress: Record<string, LessonProgress>;
  markScrolled: (lessonId: string) => void;
  recordQuiz: (lessonId: string, score: number) => void;
}

export const useLearnStore = create<LearnStore>()(
  persist(
    (set) => ({
      progress: {},
      markScrolled: (lessonId) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: {
              scrolledToEnd: true,
              quizBestScore: state.progress[lessonId]?.quizBestScore ?? 0,
            },
          },
        })),
      recordQuiz: (lessonId, score) =>
        set((state) => ({
          progress: {
            ...state.progress,
            [lessonId]: {
              scrolledToEnd: state.progress[lessonId]?.scrolledToEnd ?? false,
              quizBestScore: Math.max(
                state.progress[lessonId]?.quizBestScore ?? 0,
                score,
              ),
            },
          },
        })),
    }),
    {
      name: "ear-train-learn",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    },
  ),
);

/** Whether a lesson's stored progress satisfies the completion rule. */
export function isLessonComplete(
  progress: LessonProgress | undefined,
): boolean {
  return (
    Boolean(progress?.scrolledToEnd) &&
    (progress?.quizBestScore ?? 0) >= PASS_THRESHOLD
  );
}
