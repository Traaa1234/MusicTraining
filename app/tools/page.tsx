// app/tools/page.tsx
import Link from "next/link";

const TOOLS = [
  {
    href: "/tools/scales",
    title: "Scales",
    description: "Build any scale and see it on the piano and fretboard.",
  },
  {
    href: "/tools/circle-of-fifths",
    title: "Circle of Fifths",
    description: "Interactive circle — click a key to hear it.",
  },
  {
    href: "/tools/chords",
    title: "Chord Library",
    description: "Every chord type × every root, with fingering diagrams.",
  },
  {
    href: "/tools/chord-progression-builder",
    title: "Chord Progression Builder",
    description: "Drag chords into a progression and play it back.",
  },
  {
    href: "/tools/tuner",
    title: "Tuner",
    description: "Real-time pitch detection through your microphone.",
  },
];

export default function ToolsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Tools</h1>
      <p className="mt-2 text-muted-foreground">
        Interactive instruments and reference tools.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="block rounded-lg border bg-card p-5 transition-colors hover:bg-muted"
          >
            <h2 className="text-lg font-semibold tracking-tight">
              {tool.title}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
