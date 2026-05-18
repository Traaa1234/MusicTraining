import { LearnHub } from "@/components/learn/LearnHub";
import { CATEGORIES, lessonsInCategory } from "@/lib/lessons";

export default function LearnPage() {
  const categories = CATEGORIES.map((category) => ({
    ...category,
    lessons: lessonsInCategory(category.id).map(
      ({ Component, ...meta }) => {
        void Component;
        return meta;
      },
    ),
  }));
  return <LearnHub categories={categories} />;
}
