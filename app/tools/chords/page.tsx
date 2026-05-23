// app/tools/chords/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { ChordQuality, NoteName } from "@/types/music";
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { getChordShapes } from "@/lib/music/chord-shapes";
import { SHARP_NOTE_NAMES } from "@/lib/music/notes";
import { cn } from "@/lib/utils";

const QUALITIES: Array<{ value: ChordQuality; label: string }> = [
  { value: "major", label: "major" },
  { value: "minor", label: "minor" },
  { value: "dominant7", label: "7" },
  { value: "major7", label: "maj7" },
  { value: "minor7", label: "m7" },
  { value: "minor7b5", label: "m7♭5" },
  { value: "diminished", label: "dim" },
  { value: "diminished7", label: "dim7" },
  { value: "augmented", label: "aug" },
  { value: "sus2", label: "sus2" },
  { value: "sus4", label: "sus4" },
];

function prettyNote(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

export default function ChordLibraryPage() {
  const [root, setRoot] = useState<NoteName>("C");
  const [quality, setQuality] = useState<ChordQuality>("major");

  // Read URL state on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get("root") as NoteName | null;
    const q = params.get("quality") as ChordQuality | null;
    if (r && SHARP_NOTE_NAMES.includes(r)) setRoot(r);
    if (q && QUALITIES.some((opt) => opt.value === q)) setQuality(q);
  }, []);

  // Write URL state on change.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("root", root);
    params.set("quality", quality);
    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
  }, [root, quality]);

  const shapes = getChordShapes(root, quality);
  const qualityLabel =
    QUALITIES.find((opt) => opt.value === quality)?.label ?? quality;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-3xl font-semibold tracking-tight">Chord Library</h1>
      <p className="mt-2 text-muted-foreground">
        Browse every chord. Pick a root and a quality.
      </p>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          Root
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {SHARP_NOTE_NAMES.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRoot(n)}
              className={cn(
                "min-w-[42px] rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                root === n
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {prettyNote(n)}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">
          Quality
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {QUALITIES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setQuality(opt.value)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                quality === opt.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-card hover:bg-muted",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight">
          {prettyNote(root)} {qualityLabel}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Click any diagram to hear the chord.
        </p>
        {shapes.length === 0 ? (
          <p className="mt-6 text-muted-foreground">
            No shape available for this chord.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {shapes.map((shape, i) => (
              <div
                key={`${shape.name}-${i}`}
                className="rounded-lg border bg-card p-3 text-center"
              >
                <ChordDiagram
                  shape={shape}
                  root={root}
                  quality={quality}
                  label={`${prettyNote(root)} ${qualityLabel}`}
                />
                <p className="mt-2 text-xs text-muted-foreground">
                  {shape.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
