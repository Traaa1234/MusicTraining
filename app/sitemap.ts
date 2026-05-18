import type { MetadataRoute } from "next";
import { CATEGORIES, LESSONS } from "@/lib/lessons";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes = [
    "",
    "/learn",
    "/train",
    "/train/intervals",
    "/train/chords",
    "/train/scales",
    "/practice",
    "/practice/play-by-ear",
    "/tools",
    "/tools/circle-of-fifths",
    "/tools/scales",
    "/tools/tuner",
    "/sign-in",
    "/sign-up",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  const categoryRoutes = CATEGORIES.map((category) => ({
    url: `${SITE_URL}/learn/${category.id}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const lessonRoutes = LESSONS.map((lesson) => ({
    url: `${SITE_URL}/learn/${lesson.category}/${lesson.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...categoryRoutes, ...lessonRoutes];
}
