"use client";

// Grid of answer buttons shared by every ear-training exercise.
import { Lock } from "lucide-react";
import type { AnswerOption } from "@/lib/training/config";
import { cn } from "@/lib/utils";

export interface AnswerGridProps {
  answers: AnswerOption[];
  unlockedIds: Set<string>;
  /** When the question has been answered: the right and chosen answers. */
  feedback: { correctId: string; chosenId: string } | null;
  /** Disable all buttons (already answered, or nothing playing yet). */
  locked: boolean;
  onAnswer: (id: string) => void;
}

export function AnswerGrid({
  answers,
  unlockedIds,
  feedback,
  locked,
  onAnswer,
}: AnswerGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 min-[420px]:grid-cols-3 lg:grid-cols-4">
      {answers.map((answer) => {
        const isUnlocked = unlockedIds.has(answer.id);
        const isCorrect = feedback?.correctId === answer.id;
        const isWrongChoice =
          feedback?.chosenId === answer.id && feedback.correctId !== answer.id;

        return (
          <button
            key={answer.id}
            type="button"
            disabled={!isUnlocked || locked}
            onClick={() => onAnswer(answer.id)}
            className={cn(
              "relative flex items-center justify-center rounded-lg border px-3 py-3 text-sm font-medium transition-colors",
              "disabled:cursor-not-allowed",
              !isUnlocked && "opacity-40",
              isUnlocked &&
                !feedback &&
                !locked &&
                "bg-background hover:border-primary hover:bg-accent",
              isUnlocked && !feedback && locked && "bg-background",
              isCorrect &&
                "border-emerald-700 bg-emerald-700 text-white",
              isWrongChoice && "border-red-700 bg-red-700 text-white",
              feedback &&
                !isCorrect &&
                !isWrongChoice &&
                "bg-background opacity-60",
            )}
          >
            {answer.label}
            {!isUnlocked && (
              <Lock className="absolute right-1.5 top-1.5 size-3 text-muted-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
