// Server-side reads for pages (profile, review). Server-only; every query is
// scoped to the signed-in user.
import "server-only";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/auth";
import { isBackendConfigured } from "@/lib/backend-config";
import { db } from "@/lib/db";
import {
  exerciseAttempts,
  lessonProgress,
  srsItems,
  users,
} from "@/lib/db/schema";
import type {
  ActivityStats,
  SrsDueItem,
  UserProfile,
} from "@/lib/db/types";

const DAY_MS = 86_400_000;

/** The signed-in user (id + name + email), or null. */
export async function getSessionUser() {
  if (!isBackendConfigured) return null;
  const session = await auth();
  return session?.user ?? null;
}

/** The signed-in user's profile row. */
export async function getProfile(): Promise<UserProfile | null> {
  const user = await getSessionUser();
  if (!user) return null;
  const [row] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    instrument: row.instrument,
    skillLevel: row.skillLevel,
    dailyGoalMinutes: row.dailyGoalMinutes ?? 10,
  };
}

/** SRS items whose next review is due. */
export async function getDueSrsItems(): Promise<SrsDueItem[]> {
  const user = await getSessionUser();
  if (!user) return [];
  const rows = await db
    .select()
    .from(srsItems)
    .where(
      and(eq(srsItems.userId, user.id), lte(srsItems.nextReview, new Date())),
    )
    .orderBy(srsItems.nextReview);
  return rows.map((row) => ({
    id: row.id,
    itemType: row.itemType,
    itemKey: row.itemKey,
    easeFactor: Number(row.easeFactor ?? "2.5"),
    intervalDays: row.intervalDays ?? 1,
    repetitions: row.repetitions ?? 0,
  }));
}

/** Practice statistics for the profile dashboard. */
export async function getActivityStats(
  userId: string,
): Promise<ActivityStats> {
  const since = new Date(Date.now() - 30 * DAY_MS);

  const attempts = await db
    .select({
      exerciseType: exerciseAttempts.exerciseType,
      correct: exerciseAttempts.correct,
      responseTimeMs: exerciseAttempts.responseTimeMs,
      createdAt: exerciseAttempts.createdAt,
    })
    .from(exerciseAttempts)
    .where(
      and(
        eq(exerciseAttempts.userId, userId),
        gte(exerciseAttempts.createdAt, since),
      ),
    );

  const perDay = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(Date.now() - (29 - i) * DAY_MS)
      .toISOString()
      .slice(0, 10);
    return { date, minutes: 0, attempts: 0 };
  });
  const dayIndex = new Map(perDay.map((day, i) => [day.date, i]));

  const weekAgo = Date.now() - 7 * DAY_MS;
  let attemptsThisWeek = 0;
  let practiceMsThisWeek = 0;
  const byType = new Map<string, { total: number; correct: number }>();
  const activeDays = new Set<string>();

  for (const row of attempts) {
    const created = row.createdAt ? new Date(row.createdAt) : new Date(0);
    const day = created.toISOString().slice(0, 10);
    activeDays.add(day);
    const idx = dayIndex.get(day);
    if (idx !== undefined) {
      perDay[idx].attempts += 1;
      perDay[idx].minutes += (row.responseTimeMs ?? 0) / 60000;
    }
    if (created.getTime() >= weekAgo) {
      attemptsThisWeek += 1;
      practiceMsThisWeek += row.responseTimeMs ?? 0;
    }
    const stat = byType.get(row.exerciseType) ?? { total: 0, correct: 0 };
    stat.total += 1;
    if (row.correct) stat.correct += 1;
    byType.set(row.exerciseType, stat);
  }

  let streakDays = 0;
  let cursor = new Date();
  if (!activeDays.has(cursor.toISOString().slice(0, 10))) {
    cursor = new Date(cursor.getTime() - DAY_MS);
  }
  while (activeDays.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
  }

  const lessonsCompleted = await db.$count(
    lessonProgress,
    eq(lessonProgress.userId, userId),
  );
  const dueCount = await db.$count(
    srsItems,
    and(eq(srsItems.userId, userId), lte(srsItems.nextReview, new Date())),
  );

  return {
    attemptsThisWeek,
    practiceMinutesThisWeek: Math.round(practiceMsThisWeek / 60000),
    accuracyByType: [...byType.entries()].map(([type, stat]) => ({
      type,
      total: stat.total,
      correct: stat.correct,
      pct: stat.total
        ? Math.round((stat.correct / stat.total) * 100)
        : 0,
    })),
    perDay: perDay.map((day) => ({
      date: day.date,
      minutes: Math.round(day.minutes * 10) / 10,
      attempts: day.attempts,
    })),
    streakDays,
    lessonsCompleted,
    dueCount,
  };
}
