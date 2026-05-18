import { notFound } from "next/navigation";
import { CategoryLessons } from "@/components/learn/CategoryLessons";
import { CATEGORIES, getCategory, lessonsInCategory } from "@/lib/lessons";

export function generateStaticParams() {
  return CATEGORIES.map((category) => ({ category: category.id }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const found = getCategory(category);
  if (!found) notFound();

  const lessons = lessonsInCategory(category).map(({ Component, ...meta }) => {
    void Component;
    return meta;
  });

  return <CategoryLessons category={found} lessons={lessons} />;
}
