"use client";

// Lesson hub: a category grid with a completion progress bar on each card.
import { useEffect } from "react";
import Link from "next/link";
import {
  type Category,
  type LessonFrontmatter,
  lessonId,
} from "@/lib/lessons";
import { isLessonComplete, useLearnStore } from "@/lib/store/learn-store";

export type CategoryWithLessons = Category & {
  lessons: LessonFrontmatter[];
};

export function LearnHub({
  categories,
}: {
  categories: CategoryWithLessons[];
}) {
  const progress = useLearnStore((store) => store.progress);

  useEffect(() => {
    void useLearnStore.persist.rehydrate();
  }, []);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Learn</h1>
        <p className="text-muted-foreground">
          Work through music theory one category at a time. Progress is saved
          as you go.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {categories.map((category) => {
          const total = category.lessons.length;
          const completed = category.lessons.filter((lesson) =>
            isLessonComplete(progress[lessonId(lesson)]),
          ).length;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <Link
              key={category.id}
              href={`/learn/${category.id}`}
              className="flex flex-col gap-3 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold">{category.title}</h2>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  {total > 0 ? `${completed} / ${total}` : "Soon"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {category.description}
              </p>
              <div className="mt-auto h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
