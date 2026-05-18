"use client";

// Spaced-repetition review: quizzes the user on exactly the SRS items that
// are due, and advances each item's schedule via SM-2.
import { useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";
import { stopAll } from "@/lib/audio/playback";
import { qualityFromOutcome } from "@/lib/srs/sm2";
import { applySrsReview } from "@/lib/db/actions";
import type { SrsDueItem, SrsItemType } from "@/lib/db/types";
import type { ExerciseSettings } from "@/lib/store/training-store";
import {
  CONFIGS,
  type Exercise,
  type ExerciseConfig,
} from "@/lib/training/config";
import { AnswerGrid } from "@/components/training/AnswerGrid";
import { FeedbackOverlay } from "@/components/training/FeedbackOverlay";
import { Button } from "@/components/ui/button";

const TYPE_TO_KIND = {
  interval: "intervals",
  chord: "chords",
  scale: "scales",
} as const;

const REVIEW_SETTINGS: ExerciseSettings = {
  direction: "ascending",
  rootMode: "random",
  arpeggiated: false,
};

interface ReviewCard {
  item: SrsDueItem;
  config: ExerciseConfig;
  answerId: string;
}

export function ReviewSession({ items }: { items: SrsDueItem[] }) {
  const cards = useMemo<ReviewCard[]>(
    () =>
      items.flatMap((item) => {
        const kind =
          TYPE_TO_KIND[item.itemType as keyof typeof TYPE_TO_KIND];
        if (!kind) return [];
        const answerId = item.itemKey.includes(":")
          ? item.itemKey.slice(item.itemKey.indexOf(":") + 1)
          : item.itemKey;
        return [{ item, config: CONFIGS[kind], answerId }];
      }),
    [items],
  );

  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [current, setCurrent] = useState<Exercise | null>(null);
  const [feedback, setFeedback] = useState<{
    state: "correct" | "wrong";
    chosenId: string;
  } | null>(null);
  const [correctCount, setCorrectCount] = useState(0);

  const card = cards[index];

  useEffect(() => () => stopAll(), []);

  const present = (reviewCard: ReviewCard) => {
    const exercise = reviewCard.config.generateFor(
      reviewCard.answerId,
      REVIEW_SETTINGS,
    );
    setCurrent(exercise);
    setFeedback(null);
    stopAll();
    void reviewCard.config.play(exercise);
  };

  const handleStart = () => {
    setStarted(true);
    present(cards[0]);
  };

  const handleAnswer = (id: string) => {
    if (!current || feedback || !card) return;
    const correct = id === card.answerId;
    if (correct) setCorrectCount((value) => value + 1);
    setFeedback({ state: correct ? "correct" : "wrong", chosenId: id });
    void applySrsReview(
      card.item.itemType as SrsItemType,
      card.item.itemKey,
      qualityFromOutcome(correct),
    );
  };

  const handleNext = () => {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    if (nextIndex < cards.length) {
      present(cards[nextIndex]);
    } else {
      setCurrent(null);
      stopAll();
    }
  };

  if (cards.length === 0) {
    return (
      <p className="rounded-xl border bg-card p-6 text-center text-muted-foreground">
        Your due items aren&apos;t reviewable exercises yet.
      </p>
    );
  }

  // Intro
  if (!started) {
    return (
      <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
        <p className="text-5xl font-semibold tabular-nums">{cards.length}</p>
        <p className="text-muted-foreground">
          {cards.length === 1 ? "item is" : "items are"} due for review.
        </p>
        <Button onClick={handleStart}>
          <Play className="size-4" fill="currentColor" />
          Start review
        </Button>
      </div>
    );
  }

  // Summary
  if (index >= cards.length) {
    const pct = Math.round((correctCount / cards.length) * 100);
    return (
      <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          Review complete
        </p>
        <p className="text-5xl font-semibold tabular-nums">{pct}%</p>
        <p className="text-muted-foreground">
          {correctCount} of {cards.length} correct — schedules updated.
        </p>
        <p className="text-xs text-muted-foreground">
          Items you missed will come back sooner; the rest are pushed further
          out.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Item {index + 1} of {cards.length}
        </span>
        <span className="capitalize">{card.item.itemType}</span>
      </div>

      <div className="relative space-y-5 overflow-hidden rounded-xl border bg-card p-6">
        <p className="text-center text-sm text-muted-foreground">
          {card.config.instruction}
        </p>

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => current && void card.config.play(current)}
            aria-label="Replay"
            className="flex size-20 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Play className="size-9 translate-x-0.5" fill="currentColor" />
          </button>
        </div>

        <AnswerGrid
          answers={card.config.answers}
          unlockedIds={new Set(card.config.answers.map((a) => a.id))}
          feedback={
            feedback
              ? { correctId: card.answerId, chosenId: feedback.chosenId }
              : null
          }
          locked={!current || feedback !== null}
          onAnswer={handleAnswer}
        />

        <FeedbackOverlay
          feedback={feedback ? { state: feedback.state } : null}
        />
      </div>

      {feedback && (
        <div className="flex justify-end">
          <Button onClick={handleNext}>
            {index + 1 < cards.length ? "Next item" : "Finish"}
          </Button>
        </div>
      )}
    </div>
  );
}
