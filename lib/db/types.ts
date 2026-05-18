// Shared, framework-agnostic types for the data layer.

export type SrsItemType = "interval" | "chord" | "scale" | "lesson-concept";

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  instrument: string | null;
  skillLevel: string | null;
  dailyGoalMinutes: number;
}

export interface SrsDueItem {
  id: string;
  itemType: string;
  itemKey: string;
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
}

export interface ActivityStats {
  attemptsThisWeek: number;
  practiceMinutesThisWeek: number;
  accuracyByType: {
    type: string;
    total: number;
    correct: number;
    pct: number;
  }[];
  perDay: { date: string; minutes: number; attempts: number }[];
  streakDays: number;
  lessonsCompleted: number;
  dueCount: number;
}
