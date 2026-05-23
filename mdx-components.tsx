// Global MDX component map. @next/mdx picks this up for every compiled .mdx
// file, so lessons can use <Piano />, <Quiz />, etc. with no per-file imports,
// and prose elements get consistent styling.
import type { MDXComponents } from "mdx/types";
import {
  MdxChordDiagram,
  MdxCircleOfFifths,
  MdxFretboard,
  MdxPiano,
  MdxPlayButton,
} from "@/components/learn/mdx-embeds";
import { Option, Question, Quiz } from "@/components/learn/Quiz";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props) => (
      <h1 className="mt-2 text-3xl font-semibold tracking-tight" {...props} />
    ),
    h2: (props) => (
      <h2
        className="mt-10 border-b pb-1.5 text-xl font-semibold tracking-tight"
        {...props}
      />
    ),
    h3: (props) => (
      <h3 className="mt-7 text-lg font-semibold tracking-tight" {...props} />
    ),
    p: (props) => <p className="my-3 leading-7 text-foreground/90" {...props} />,
    ul: (props) => (
      <ul className="my-3 list-disc space-y-1 pl-6" {...props} />
    ),
    ol: (props) => (
      <ol className="my-3 list-decimal space-y-1 pl-6" {...props} />
    ),
    li: (props) => <li className="leading-7 text-foreground/90" {...props} />,
    a: (props) => (
      <a
        className="font-medium text-primary underline underline-offset-2"
        {...props}
      />
    ),
    strong: (props) => <strong className="font-semibold" {...props} />,
    blockquote: (props) => (
      <blockquote
        className="my-4 border-l-2 border-primary pl-4 italic text-muted-foreground"
        {...props}
      />
    ),
    code: (props) => (
      <code
        className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em]"
        {...props}
      />
    ),
    pre: (props) => (
      <pre
        className="my-4 overflow-x-auto rounded-lg bg-muted p-4 text-sm"
        {...props}
      />
    ),
    hr: (props) => <hr className="my-8 border-border" {...props} />,
    table: (props) => (
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm" {...props} />
      </div>
    ),
    th: (props) => (
      <th
        className="border bg-muted px-3 py-1.5 text-left font-semibold"
        {...props}
      />
    ),
    td: (props) => <td className="border px-3 py-1.5" {...props} />,
    Piano: MdxPiano,
    Fretboard: MdxFretboard,
    CircleOfFifths: MdxCircleOfFifths,
    PlayButton: MdxPlayButton,
    ChordDiagram: MdxChordDiagram,
    Quiz,
    Question,
    Option,
    ...components,
  };
}
