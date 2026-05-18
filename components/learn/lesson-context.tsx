"use client";

// Shares the current lesson id (`category/slug`) from LessonShell down to any
// <Quiz> embedded in the MDX, so quiz scores attach to the right lesson.
import { createContext, useContext } from "react";

const LessonIdContext = createContext<string | null>(null);

export const LessonProvider = LessonIdContext.Provider;

export function useLessonId(): string | null {
  return useContext(LessonIdContext);
}
