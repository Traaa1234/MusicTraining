// Drizzle schema — Auth.js tables plus Ear Train's app tables.
//
// The `user` table is the Auth.js users table extended with profile columns.
// Ownership is enforced in server code (every query is scoped to the signed-in
// user), since plain Postgres has no Supabase-style request-aware RLS.
import type { AdapterAccountType } from "next-auth/adapters";
import {
  boolean,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// --- Auth.js core tables (+ Ear Train profile columns) ----------------------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  // Ear Train profile fields
  passwordHash: text("password_hash"),
  username: text("username").unique(),
  instrument: text("instrument"),
  skillLevel: text("skill_level"),
  dailyGoalMinutes: integer("daily_goal_minutes").default(10),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// --- Ear Train data tables --------------------------------------------------

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonSlug: text("lesson_slug").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    quizScore: numeric("quiz_score"),
    timeSpentSeconds: integer("time_spent_seconds"),
  },
  (t) => [unique().on(t.userId, t.lessonSlug)],
);

export const exerciseAttempts = pgTable("exercise_attempts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  exerciseType: text("exercise_type").notNull(),
  question: jsonb("question"),
  userAnswer: text("user_answer"),
  correct: boolean("correct"),
  responseTimeMs: integer("response_time_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const srsItems = pgTable(
  "srs_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemType: text("item_type").notNull(),
    itemKey: text("item_key").notNull(),
    easeFactor: numeric("ease_factor").default("2.5"),
    intervalDays: integer("interval_days").default(1),
    nextReview: timestamp("next_review", { withTimezone: true }).defaultNow(),
    lastReviewed: timestamp("last_reviewed", { withTimezone: true }),
    repetitions: integer("repetitions").default(0),
  },
  (t) => [unique().on(t.userId, t.itemType, t.itemKey)],
);

export const practiceSessions = pgTable("practice_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  activities: jsonb("activities"),
});
