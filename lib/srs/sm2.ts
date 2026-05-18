// SM-2 spaced-repetition algorithm (SuperMemo 2).
//
// Given a review quality (0-5) it updates an item's ease factor, interval,
// repetition count, and next-review date. Quality < 3 counts as a lapse and
// restarts the interval; the ease factor is always nudged by quality.

/** The scheduling fields SM-2 reads and writes. */
export interface SrsSchedule {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string; // ISO timestamp
  lastReviewed: string; // ISO timestamp
}

/** A fresh item, never reviewed. */
export function newSchedule(): SrsSchedule {
  return {
    easeFactor: 2.5,
    intervalDays: 1,
    repetitions: 0,
    nextReview: new Date().toISOString(),
    lastReviewed: "",
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Applies one SM-2 review. `quality` is the recall grade 0-5
 * (5 = perfect, 3 = correct with effort, < 3 = lapse).
 */
export function review(
  item: Pick<SrsSchedule, "easeFactor" | "intervalDays" | "repetitions">,
  quality: number,
): SrsSchedule {
  const q = Math.max(0, Math.min(5, Math.round(quality)));

  let { easeFactor, intervalDays, repetitions } = item;

  if (q < 3) {
    // Lapse — relearn from the start.
    repetitions = 0;
    intervalDays = 1;
  } else {
    if (repetitions === 0) intervalDays = 1;
    else if (repetitions === 1) intervalDays = 6;
    else intervalDays = Math.round(intervalDays * easeFactor);
    repetitions += 1;
  }

  // Ease factor adjustment — never drops below 1.3.
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)),
  );

  const now = Date.now();
  return {
    easeFactor: Number(easeFactor.toFixed(2)),
    intervalDays,
    repetitions,
    nextReview: new Date(now + intervalDays * DAY_MS).toISOString(),
    lastReviewed: new Date(now).toISOString(),
  };
}

/** Maps an exercise outcome to an SM-2 quality grade. */
export function qualityFromOutcome(
  correct: boolean,
  usedHint = false,
): number {
  if (!correct) return 1;
  return usedHint ? 3 : 5;
}
