"use client";

// Wraps lesson MDX content: provides the lesson id to embedded quizzes,
// detects when the reader reaches the end, and shows a completion card once
// both requirements (read to end + quiz >= 70%) are met.
import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Circle } from "lucide-react";
import { LessonProvider } from "@/components/learn/lesson-context";
import { Button } from "@/components/ui/button";
import { logLessonProgress } from "@/lib/db/actions";
import {
  PASS_THRESHOLD,
  isLessonComplete,
  useLearnStore,
} from "@/lib/store/learn-store";
import { cn } from "@/lib/utils";

export interface LessonShellProps {
  lessonId: string;
  categoryHref: string;
  nextHref: string | null;
  nextTitle: string | null;
  children: React.ReactNode;
}

function Requirement({ met, label }: { met: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {met ? (
        <Check className="size-4 text-emerald-600" />
      ) : (
        <Circle className="size-4 text-muted-foreground" />
      )}
      <span className={cn(met && "text-muted-foreground line-through")}>
        {label}
      </span>
    </li>
  );
}

export function LessonShell({
  lessonId,
  categoryHref,
  nextHref,
  nextTitle,
  children,
}: LessonShellProps) {
  const progress = useLearnStore((store) => store.progress[lessonId]);
  const markScrolled = useLearnStore((store) => store.markScrolled);

  // Rehydrate persisted progress first, then watch for the reader reaching
  // the bottom — so an early scroll mark is not clobbered by rehydration.
  useEffect(() => {
    let cleanup = () => {};
    const check = () => {
      const reachedEnd =
        window.scrollY + window.innerHeight >=
        document.documentElement.scrollHeight - 96;
      if (reachedEnd) markScrolled(lessonId);
    };
    void Promise.resolve(useLearnStore.persist.rehydrate()).then(() => {
      check();
      window.addEventListener("scroll", check, { passive: true });
      window.addEventListener("resize", check);
      cleanup = () => {
        window.removeEventListener("scroll", check);
        window.removeEventListener("resize", check);
      };
    });
    return () => cleanup();
  }, [lessonId, markScrolled]);

  const scrolled = progress?.scrolledToEnd ?? false;
  const quizScore = progress?.quizBestScore ?? 0;
  const quizPassed = quizScore >= PASS_THRESHOLD;
  const complete = isLessonComplete(progress);

  // Sync completion to Supabase once (best-effort).
  const syncedRef = useRef(false);
  useEffect(() => {
    if (complete && !syncedRef.current) {
      syncedRef.current = true;
      void logLessonProgress(lessonId, quizScore);
    }
  }, [complete, lessonId, quizScore]);

  return (
    <LessonProvider value={lessonId}>
      {children}

      <div
        className={cn(
          "mt-10 rounded-xl border p-5",
          complete
            ? "border-emerald-600/40 bg-emerald-600/10"
            : "bg-card",
        )}
      >
        {complete ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-medium">
              <Check className="size-5 text-emerald-600" />
              Lesson complete
            </p>
            {nextHref ? (
              <Button asChild>
                <Link href={nextHref}>
                  Next: {nextTitle}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link href={categoryHref}>Back to category</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">To complete this lesson:</p>
            <ul className="space-y-1">
              <Requirement met={scrolled} label="Read to the end" />
              <Requirement
                met={quizPassed}
                label={`Score ${PASS_THRESHOLD}%+ on the quiz${
                  quizScore > 0 ? ` (best: ${quizScore}%)` : ""
                }`}
              />
            </ul>
          </div>
        )}
      </div>
    </LessonProvider>
  );
}
