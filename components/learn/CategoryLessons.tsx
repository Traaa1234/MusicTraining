"use client";

// Lists the lessons in one category. Lessons unlock sequentially — a lesson
// becomes available once the previous one is complete.
import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Clock, Lock } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  type Category,
  type LessonFrontmatter,
  lessonId,
} from "@/lib/lessons";
import { isLessonComplete, useLearnStore } from "@/lib/store/learn-store";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  beginner: "bg-emerald-600/15 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-600/15 text-red-600 dark:text-red-400",
};

export function CategoryLessons({
  category,
  lessons,
}: {
  category: Category;
  lessons: LessonFrontmatter[];
}) {
  const progress = useLearnStore((store) => store.progress);

  useEffect(() => {
    void useLearnStore.persist.rehydrate();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          All categories
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {category.title}
        </h1>
        <p className="text-muted-foreground">{category.description}</p>
      </div>

      {lessons.length === 0 ? (
        <EmptyState
          title="No lessons yet"
          description="Lessons for this category are coming soon — check back later."
        />
      ) : (
        <ol className="space-y-2">
          {lessons.map((lesson, index) => {
            const complete = isLessonComplete(progress[lessonId(lesson)]);
            const unlocked =
              index === 0 ||
              isLessonComplete(progress[lessonId(lessons[index - 1])]);

            const inner = (
              <>
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                    complete
                      ? "bg-emerald-600 text-white"
                      : unlocked
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {complete ? (
                    <Check className="size-4" />
                  ) : unlocked ? (
                    index + 1
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{lesson.title}</span>
                  <span className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 font-medium capitalize",
                        LEVEL_STYLES[lesson.level],
                      )}
                    >
                      {lesson.level}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {lesson.estimatedMinutes} min
                    </span>
                  </span>
                </span>
              </>
            );

            return (
              <li key={lesson.slug}>
                {unlocked ? (
                  <Link
                    href={`/learn/${category.id}/${lesson.slug}`}
                    className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary"
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="flex cursor-not-allowed items-center gap-3 rounded-xl border bg-card p-4 opacity-60">
                    {inner}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
