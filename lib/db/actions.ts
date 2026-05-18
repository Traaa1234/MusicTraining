"use server";

// Server Actions — the only way the client writes to the database. Each is
// best-effort and a no-op when the backend is unconfigured or no user is
// signed in, so anonymous use of the app is never blocked.
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { isBackendConfigured } from "@/lib/backend-config";
import { db } from "@/lib/db";
import {
  exerciseAttempts,
  lessonProgress,
  srsItems,
  users,
} from "@/lib/db/schema";
import type { SrsItemType } from "@/lib/db/types";
import { review } from "@/lib/srs/sm2";

async function currentUserId(): Promise<string | null> {
  if (!isBackendConfigured) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Creates an email/password account. The client signs in afterwards. */
export async function signUpWithEmail(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isBackendConfigured) {
    return { ok: false, error: "Accounts are not enabled yet." };
  }
  const email = input.email.toLowerCase().trim();
  if (!email.includes("@") || input.password.length < 6) {
    return {
      ok: false,
      error: "Enter a valid email and a password of at least 6 characters.",
    };
  }
  try {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      return { ok: false, error: "That email is already registered." };
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    await db.insert(users).values({
      email,
      name: input.name?.trim() || email.split("@")[0],
      passwordHash,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not create the account." };
  }
}

/** Updates (or creates) an item's SRS schedule via SM-2. */
export async function applySrsReview(
  itemType: SrsItemType,
  itemKey: string,
  quality: number,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    const [existing] = await db
      .select()
      .from(srsItems)
      .where(
        and(
          eq(srsItems.userId, userId),
          eq(srsItems.itemType, itemType),
          eq(srsItems.itemKey, itemKey),
        ),
      )
      .limit(1);

    const updated = review(
      existing
        ? {
            easeFactor: Number(existing.easeFactor ?? "2.5"),
            intervalDays: existing.intervalDays ?? 1,
            repetitions: existing.repetitions ?? 0,
          }
        : { easeFactor: 2.5, intervalDays: 1, repetitions: 0 },
      quality,
    );

    const fields = {
      easeFactor: String(updated.easeFactor),
      intervalDays: updated.intervalDays,
      repetitions: updated.repetitions,
      nextReview: new Date(updated.nextReview),
      lastReviewed: new Date(updated.lastReviewed),
    };

    if (existing) {
      await db.update(srsItems).set(fields).where(eq(srsItems.id, existing.id));
    } else {
      await db.insert(srsItems).values({ userId, itemType, itemKey, ...fields });
    }
  } catch {
    /* best-effort */
  }
}

/** Records one exercise attempt and advances its SRS schedule. */
export async function logExercise(params: {
  exerciseType: "interval" | "chord" | "scale";
  itemKey: string;
  question: unknown;
  userAnswer: string;
  correct: boolean;
  responseTimeMs: number;
  quality: number;
}): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await db.insert(exerciseAttempts).values({
      userId,
      exerciseType: params.exerciseType,
      question: params.question,
      userAnswer: params.userAnswer,
      correct: params.correct,
      responseTimeMs: params.responseTimeMs,
    });
  } catch {
    /* best-effort */
  }
  await applySrsReview(params.exerciseType, params.itemKey, params.quality);
}

/** Upserts lesson completion progress. */
export async function logLessonProgress(
  lessonSlug: string,
  quizScore: number,
): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await db
      .insert(lessonProgress)
      .values({
        userId,
        lessonSlug,
        completedAt: new Date(),
        quizScore: String(quizScore),
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonSlug],
        set: { completedAt: new Date(), quizScore: String(quizScore) },
      });
  } catch {
    /* best-effort */
  }
}

/** Saves editable profile settings. */
export async function updateProfile(input: {
  instrument: string;
  skillLevel: string;
  dailyGoalMinutes: number;
}): Promise<void> {
  const userId = await currentUserId();
  if (!userId) return;
  try {
    await db
      .update(users)
      .set({
        instrument: input.instrument || null,
        skillLevel: input.skillLevel || null,
        dailyGoalMinutes: input.dailyGoalMinutes,
      })
      .where(eq(users.id, userId));
  } catch {
    /* best-effort */
  }
}
