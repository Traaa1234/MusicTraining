// Augments the ambient "*.mdx" module (from @types/mdx) so lesson files can
// expose typed frontmatter via `export const frontmatter = { ... }`.
declare module "*.mdx" {
  export const frontmatter: {
    title: string;
    slug: string;
    level: "beginner" | "intermediate" | "advanced";
    category: string;
    prerequisites: string[];
    estimatedMinutes: number;
    order: number;
  };
}
