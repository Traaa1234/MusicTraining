"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Play, Plus, Square } from "lucide-react";
import type { ChordQuality, NoteName, ScaleType } from "@/types/music";
import { Fretboard } from "@/components/music/Fretboard";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  type BackingBar,
  BackingTrackEngine,
  type TrackName,
} from "@/lib/audio/backing-track";
import { buildChord } from "@/lib/music/chords";
import {
  SHARP_NOTE_NAMES,
  chromaOf,
  nameFromChroma,
  preferAccidentalFor,
} from "@/lib/music/notes";
import { buildScale } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

// --- progression families ---------------------------------------------------

interface PatternStep {
  offset: number; // semitones above the key root
  quality: ChordQuality;
}

interface Family {
  id: string;
  name: string;
  tempo: number;
  defaultKey: NoteName;
  soloScale: ScaleType;
  soloLabel: string;
  pattern: PatternStep[];
}

const dom = (offset: number): PatternStep => ({ offset, quality: "dominant7" });

const FAMILIES: Family[] = [
  {
    id: "blues",
    name: "12-Bar Blues",
    tempo: 100,
    defaultKey: "A",
    soloScale: "minor-pentatonic",
    soloLabel: "minor pentatonic",
    pattern: [
      dom(0), dom(0), dom(0), dom(0),
      dom(5), dom(5), dom(0), dom(0),
      dom(7), dom(5), dom(0), dom(7),
    ],
  },
  {
    id: "two-five-one",
    name: "ii–V–I",
    tempo: 120,
    defaultKey: "C",
    soloScale: "major",
    soloLabel: "major scale",
    pattern: [
      { offset: 2, quality: "minor7" },
      { offset: 7, quality: "dominant7" },
      { offset: 0, quality: "major7" },
      { offset: 0, quality: "major7" },
    ],
  },
  {
    id: "pop",
    name: "I–V–vi–IV",
    tempo: 110,
    defaultKey: "C",
    soloScale: "major",
    soloLabel: "major scale",
    pattern: [
      { offset: 0, quality: "major" },
      { offset: 7, quality: "major" },
      { offset: 9, quality: "minor" },
      { offset: 5, quality: "major" },
    ],
  },
];

const prettyNote = (name: string) => name.replace(/#/g, "♯").replace(/b/g, "♭");

function buildBars(family: Family, key: NoteName): BackingBar[] {
  const base = chromaOf(key);
  const prefer = preferAccidentalFor(key);
  return family.pattern.map((step) => ({
    chord: buildChord(nameFromChroma(base + step.offset, prefer), step.quality),
  }));
}

// --- page -------------------------------------------------------------------

export default function PlayAlongPage() {
  const [familyId, setFamilyId] = useState(FAMILIES[0].id);
  const [key, setKey] = useState<NoteName>(FAMILIES[0].defaultKey);
  const [tempo, setTempo] = useState(FAMILIES[0].tempo);
  const [loops, setLoops] = useState(4);
  const [muted, setMuted] = useState<Record<TrackName, boolean>>({
    drums: false,
    bass: false,
    chords: false,
  });
  const [playing, setPlaying] = useState(false);
  const [currentBar, setCurrentBar] = useState(-1);

  const engineRef = useRef<BackingTrackEngine | null>(null);
  const getEngine = () => {
    if (!engineRef.current) engineRef.current = new BackingTrackEngine();
    return engineRef.current;
  };

  useEffect(() => {
    return () => engineRef.current?.dispose();
  }, []);

  const family = FAMILIES.find((f) => f.id === familyId) ?? FAMILIES[0];
  const bars = useMemo(() => buildBars(family, key), [family, key]);
  const soloScale = useMemo(
    () => buildScale(key, family.soloScale),
    [key, family.soloScale],
  );

  const stop = () => {
    getEngine().stop();
    setPlaying(false);
    setCurrentBar(-1);
  };

  const handlePlay = () => {
    if (playing) {
      stop();
      return;
    }
    setPlaying(true);
    void getEngine().play({
      bars,
      tempo,
      loops,
      onBar: setCurrentBar,
      onStop: () => {
        setPlaying(false);
        setCurrentBar(-1);
      },
    });
  };

  const chooseFamily = (next: Family) => {
    stop();
    setFamilyId(next.id);
    setKey(next.defaultKey);
    setTempo(next.tempo);
  };

  const chooseKey = (next: NoteName) => {
    stop();
    setKey(next);
  };

  const changeTempo = (value: number) => {
    setTempo(value);
    if (playing) getEngine().setTempo(value);
  };

  const toggleMute = (track: TrackName) => {
    const next = !muted[track];
    setMuted((prev) => ({ ...prev, [track]: next }));
    getEngine().setMuted(track, next);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Play Along</h1>
        <p className="text-muted-foreground">
          Procedurally generated backing tracks — pick a progression and solo
          over it.
        </p>
      </header>

      {/* controls */}
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <Field label="Progression">
          <div className="flex flex-wrap gap-1.5">
            {FAMILIES.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => chooseFamily(option)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  familyId === option.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )}
              >
                {option.name}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Key">
          <div className="flex flex-wrap gap-1.5">
            {SHARP_NOTE_NAMES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => chooseKey(note)}
                className={cn(
                  "min-w-10 rounded-md border px-2 py-1.5 text-sm font-medium transition-colors",
                  chromaOf(key) === chromaOf(note)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )}
              >
                {prettyNote(note)}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Tempo">
          <div className="flex items-center gap-3">
            <Slider
              min={60}
              max={200}
              step={1}
              value={[tempo]}
              onValueChange={(value) => changeTempo(value[0])}
              aria-label="Tempo"
            />
            <span className="w-16 text-sm tabular-nums">{tempo} BPM</span>
          </div>
        </Field>

        <Field label="Loops">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label="Fewer loops"
              disabled={loops <= 1}
              onClick={() => setLoops((value) => Math.max(1, value - 1))}
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-6 text-center text-sm tabular-nums">
              {loops}
            </span>
            <Button
              size="icon"
              variant="outline"
              aria-label="More loops"
              disabled={loops >= 8}
              onClick={() => setLoops((value) => Math.min(8, value + 1))}
            >
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>
      </div>

      {/* transport + mutes */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <Button size="lg" onClick={handlePlay}>
          {playing ? (
            <Square className="size-4" />
          ) : (
            <Play className="size-4" fill="currentColor" />
          )}
          {playing ? "Stop" : "Play"}
        </Button>
        <div className="flex gap-1.5">
          {(["drums", "bass", "chords"] as TrackName[]).map((track) => (
            <button
              key={track}
              type="button"
              aria-pressed={!muted[track]}
              onClick={() => toggleMute(track)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                muted[track]
                  ? "bg-background text-muted-foreground line-through"
                  : "border-primary bg-primary/10 text-primary",
              )}
            >
              {track}
            </button>
          ))}
        </div>
      </div>

      {/* chord chart */}
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Chord chart — {prettyNote(key)} {family.name}
        </h2>
        <div className="grid grid-cols-4 gap-1.5">
          {bars.map((bar, index) => (
            <div
              key={index}
              className={cn(
                "flex h-14 items-center justify-center rounded-md border text-sm font-semibold transition-colors",
                index === currentBar
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background",
              )}
            >
              {prettyNote(bar.chord.symbol)}
            </div>
          ))}
        </div>
      </div>

      {/* solo fretboard */}
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Solo with — {prettyNote(key)} {family.soloLabel}
        </h2>
        <Fretboard scale={soloScale} numFrets={12} showNoteNames />
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}
