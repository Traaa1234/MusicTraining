// Lesson + category registry.
//
// Lessons are MDX files under content/lessons/. Each file exports a
// `frontmatter` object; the compiled MDX component is its default export.
// New lessons are added by creating the .mdx file and importing it here.
import type { ComponentType } from "react";
import * as halfAndWholeSteps from "@/content/lessons/fundamentals/half-and-whole-steps.mdx";
import * as thePerfectFifth from "@/content/lessons/intervals/the-perfect-fifth.mdx";
import * as theCagedSystem from "@/content/lessons/guitar-techniques/the-caged-system.mdx";

export type LessonLevel = "beginner" | "intermediate" | "advanced";

export interface LessonFrontmatter {
  title: string;
  slug: string;
  level: LessonLevel;
  category: string;
  prerequisites: string[];
  estimatedMinutes: number;
  order: number;
}

export interface Lesson extends LessonFrontmatter {
  Component: ComponentType;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  order: number;
}

export const CATEGORIES: Category[] = [
  {
    id: "fundamentals",
    title: "Fundamentals",
    description: "Notes, octaves, steps, sharps and flats, enharmonics.",
    order: 1,
  },
  {
    id: "intervals",
    title: "Intervals",
    description:
      "Perfect, major, minor, augmented and diminished — with ear examples.",
    order: 2,
  },
  {
    id: "scales",
    title: "Scales",
    description: "Major, the three minor scales, pentatonics and blues.",
    order: 3,
  },
  {
    id: "modes",
    title: "Modes",
    description:
      "The seven modes, when to use each, and their characteristic notes.",
    order: 4,
  },
  {
    id: "chords",
    title: "Chords",
    description: "Triads, sevenths, extensions and voicings.",
    order: 5,
  },
  {
    id: "progressions",
    title: "Chord Progressions",
    description:
      "Cadences, ii–V–I, I–V–vi–IV, blues and modal interchange.",
    order: 6,
  },
  {
    id: "key-signatures",
    title: "Key Signatures",
    description: "Key signatures and the circle of fifths.",
    order: 7,
  },
  {
    id: "rhythm",
    title: "Rhythm Basics",
    description: "Time signatures, note durations and common patterns.",
    order: 8,
  },
  {
    id: "guitar-techniques",
    title: "Guitar Techniques",
    description: "CAGED, pentatonic boxes and position playing.",
    order: 9,
  },
  {
    id: "pro-tricks",
    title: "Pro Tricks",
    description:
      "Chord substitution, secondary dominants, modal mixture, voice leading.",
    order: 10,
  },
];

const LESSON_MODULES = [
  halfAndWholeSteps,
  thePerfectFifth,
  theCagedSystem,
];

export const LESSONS: Lesson[] = LESSON_MODULES.map((module) => ({
  ...module.frontmatter,
  Component: module.default,
})).sort((a, b) => a.order - b.order);

/** Lesson id used as the localStorage progress key. */
export function lessonId(lesson: LessonFrontmatter): string {
  return `${lesson.category}/${lesson.slug}`;
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((category) => category.id === id);
}

export function lessonsInCategory(categoryId: string): Lesson[] {
  return LESSONS.filter((lesson) => lesson.category === categoryId).sort(
    (a, b) => a.order - b.order,
  );
}

export function getLesson(
  categoryId: string,
  slug: string,
): Lesson | undefined {
  return LESSONS.find(
    (lesson) => lesson.category === categoryId && lesson.slug === slug,
  );
}
