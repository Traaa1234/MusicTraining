import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock } from "lucide-react";
import { LessonShell } from "@/components/learn/LessonShell";
import {
  LESSONS,
  getCategory,
  getLesson,
  lessonsInCategory,
} from "@/lib/lessons";
import { cn } from "@/lib/utils";

const LEVEL_STYLES: Record<string, string> = {
  beginner: "bg-emerald-600/15 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  advanced: "bg-red-600/15 text-red-600 dark:text-red-400",
};

export function generateStaticParams() {
  return LESSONS.map((lesson) => ({
    category: lesson.category,
    slug: lesson.slug,
  }));
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ category: string; slug: string }>;
}) {
  const { category, slug } = await params;
  const lesson = getLesson(category, slug);
  if (!lesson) notFound();

  const categoryInfo = getCategory(category);
  const siblings = lessonsInCategory(category);
  const index = siblings.findIndex((item) => item.slug === slug);
  const next = index >= 0 ? siblings[index + 1] : undefined;

  const Content = lesson.Component;

  return (
    <article className="mx-auto max-w-2xl pb-16">
      <Link
        href={`/learn/${category}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {categoryInfo?.title ?? "Lessons"}
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
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
          {lesson.estimatedMinutes} min read
        </span>
      </div>

      {lesson.prerequisites.length > 0 && (
        <p className="mt-3 text-sm text-muted-foreground">
          Prerequisites:{" "}
          {lesson.prerequisites.map((prereqSlug, i) => {
            const prereq = LESSONS.find((item) => item.slug === prereqSlug);
            return (
              <span key={prereqSlug}>
                {i > 0 && ", "}
                {prereq ? (
                  <Link
                    href={`/learn/${prereq.category}/${prereq.slug}`}
                    className="font-medium text-primary underline underline-offset-2"
                  >
                    {prereq.title}
                  </Link>
                ) : (
                  prereqSlug
                )}
              </span>
            );
          })}
        </p>
      )}

      <LessonShell
        lessonId={`${category}/${slug}`}
        categoryHref={`/learn/${category}`}
        nextHref={next ? `/learn/${category}/${next.slug}` : null}
        nextTitle={next?.title ?? null}
      >
        <Content />
      </LessonShell>
    </article>
  );
}
