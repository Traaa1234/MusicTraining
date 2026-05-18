"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Minus,
  Plus,
  Repeat,
  Square,
} from "lucide-react";
import type { Chord, NoteName, Scale, ScaleType } from "@/types/music";
import { Fretboard } from "@/components/music/Fretboard";
import { Piano } from "@/components/music/Piano";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { playScale, stopAll } from "@/lib/audio/playback";
import { diatonicChords } from "@/lib/music/chords";
import { SHARP_NOTE_NAMES } from "@/lib/music/notes";
import { SCALE_FORMULAS, buildScale } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

// --- static reference data --------------------------------------------------

type Direction = "up" | "down" | "both";
type Display = "piano" | "guitar" | "both";

const SCALE_LABELS: Record<ScaleType, string> = {
  major: "Major (Ionian)",
  "natural-minor": "Natural Minor (Aeolian)",
  "harmonic-minor": "Harmonic Minor",
  "melodic-minor": "Melodic Minor",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  locrian: "Locrian",
  "major-pentatonic": "Major Pentatonic",
  "minor-pentatonic": "Minor Pentatonic",
  blues: "Blues",
};

const SCALE_GROUPS: { label: string; types: ScaleType[] }[] = [
  { label: "Major", types: ["major"] },
  {
    label: "Minor",
    types: ["natural-minor", "harmonic-minor", "melodic-minor"],
  },
  {
    label: "Modes",
    types: ["dorian", "phrygian", "lydian", "mixolydian", "locrian"],
  },
  {
    label: "Pentatonic & Blues",
    types: ["major-pentatonic", "minor-pentatonic", "blues"],
  },
];

const CHARACTERISTIC: Record<ScaleType, string> = {
  major: "The natural 7 (leading tone) pulls strongly home to the tonic.",
  "natural-minor": "The ♭6 and ♭7 give it its dark, unresolved colour.",
  "harmonic-minor":
    "A raised 7 over a minor tonic — the augmented 2nd between ♭6 and 7 is its signature.",
  "melodic-minor":
    "A minor tonic brightened by a natural 6 and 7 on the way up.",
  dorian: "A minor scale with a hopeful natural 6 — the defining Dorian sound.",
  phrygian: "The ♭2 gives it a tense, Spanish/flamenco edge.",
  lydian: "The ♯4 makes it float — dreamy and unresolved.",
  mixolydian:
    "Major with a ♭7 — dominant and bluesy, never quite resolving.",
  locrian: "A ♭2 and ♭5 leave it unstable, with no firm tonic.",
  "major-pentatonic":
    "Five notes, no semitones — open, consonant, hard to sound wrong.",
  "minor-pentatonic": "The ♭3 and ♭7 give it its bluesy rock backbone.",
  blues: "The added ♭5 'blue note' between 4 and 5 is the whole point.",
};

const PROGRESSIONS: Record<ScaleType, string[]> = {
  major: ["I – IV – V", "I – V – vi – IV", "ii – V – I"],
  "natural-minor": ["i – ♭VI – ♭VII", "i – iv – v", "i – ♭VII – ♭VI"],
  "harmonic-minor": ["i – V – i", "i – iv – V", "♭VI – V – i"],
  "melodic-minor": ["i – IV – V", "ii – V – i"],
  dorian: ["i – IV", "i – ♭VII – IV", "ii – v – i"],
  phrygian: ["i – ♭II", "i – ♭II – ♭III – ♭II"],
  lydian: ["I – II", "I – II – V"],
  mixolydian: ["I – ♭VII – IV", "I – ♭VII"],
  locrian: ["i° – ♭II", "rarely used as a tonal centre"],
  "major-pentatonic": ["I – IV – V", "I – V – vi"],
  "minor-pentatonic": ["i – ♭III – IV", "i – iv – v"],
  blues: ["12-bar blues: I7 – IV7 – V7", "I7 – IV7 – I7 – V7"],
};

const SONGS: Partial<Record<ScaleType, string[]>> = {
  major: ["Twinkle, Twinkle, Little Star", "Happy Birthday", "Ode to Joy"],
  "natural-minor": [
    "Greensleeves",
    "House of the Rising Sun",
    "Losing My Religion",
  ],
  "harmonic-minor": ["Hava Nagila", "Misirlou"],
  dorian: ["Scarborough Fair", "Eleanor Rigby", "So What — Miles Davis"],
  mixolydian: ["Sweet Home Alabama", "Norwegian Wood", "Royals — Lorde"],
  lydian: ["The Simpsons Theme", "Dreams — Fleetwood Mac"],
  "major-pentatonic": ["My Girl", "Amazing Grace", "Oh! Susanna"],
  "minor-pentatonic": [
    "Smoke on the Water",
    "Sunshine of Your Love",
    "Black Dog",
  ],
  blues: ["Sweet Home Chicago", "Pride and Joy", "The Thrill Is Gone"],
};

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"];
const DEGREE_LABELS = ["1", "2", "3", "4", "5", "6", "7", "8"];

function prettyNote(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

function stepFormula(type: ScaleType): string {
  return SCALE_FORMULAS[type]
    .map((step) => (step === 1 ? "H" : step === 2 ? "W" : "W½"))
    .join(" – ");
}

function romanFor(degree: number, chord: Chord): string {
  const base = ROMAN[degree];
  if (chord.quality === "diminished") return `${base.toLowerCase()}°`;
  if (chord.quality === "augmented") return `${base}+`;
  if (chord.quality === "minor") return base.toLowerCase();
  return base;
}

// --- page -------------------------------------------------------------------

export default function ScalesPage() {
  const [tonic, setTonic] = useState<NoteName>("C");
  const [scaleType, setScaleType] = useState<ScaleType>("major");
  const [display, setDisplay] = useState<Display>("both");
  const [tempo, setTempo] = useState(120);
  const [octaves, setOctaves] = useState(2);
  const [loop, setLoop] = useState(false);
  const [playing, setPlaying] = useState<Direction | null>(null);

  const scale = useMemo(
    () => buildScale(tonic, scaleType),
    [tonic, scaleType],
  );
  const diatonic = useMemo<Chord[] | null>(
    () => (scale.notes.length === 7 ? diatonicChords(scale) : null),
    [scale],
  );

  // Refs let the loop pick up live tempo / octave / scale / loop changes.
  const scaleRef = useRef(scale);
  const tempoRef = useRef(tempo);
  const octavesRef = useRef(octaves);
  const loopRef = useRef(loop);
  const playingRef = useRef(false);
  scaleRef.current = scale;
  tempoRef.current = tempo;
  octavesRef.current = octaves;
  loopRef.current = loop;

  useEffect(() => {
    return () => {
      playingRef.current = false;
      stopAll();
    };
  }, []);

  const play = async (direction: Direction) => {
    if (playing === direction) {
      playingRef.current = false;
      stopAll();
      setPlaying(null);
      return;
    }
    playingRef.current = false;
    stopAll();
    playingRef.current = true;
    setPlaying(direction);
    try {
      do {
        await playScale(
          scaleRef.current,
          octavesRef.current,
          tempoRef.current,
          direction,
        );
      } while (loopRef.current && playingRef.current);
    } finally {
      playingRef.current = false;
      setPlaying(null);
    }
  };

  const showPiano = display === "piano" || display === "both";
  const showGuitar = display === "guitar" || display === "both";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Scale Explorer
        </h1>
        <p className="text-muted-foreground">
          See any scale on piano and guitar at once, and learn what gives it
          its sound.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        {/* left — picker */}
        <aside className="space-y-5">
          <Panel>
            <SectionLabel>Tonic</SectionLabel>
            <div className="grid grid-cols-4 gap-1.5">
              {SHARP_NOTE_NAMES.map((note) => (
                <button
                  key={note}
                  type="button"
                  onClick={() => setTonic(note)}
                  className={cn(
                    "rounded-md border py-1.5 text-sm font-medium transition-colors",
                    tonic === note
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent",
                  )}
                >
                  {prettyNote(note)}
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Scale type</SectionLabel>
            <div className="space-y-3">
              {SCALE_GROUPS.map((group) => (
                <div key={group.label} className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </p>
                  {group.types.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setScaleType(type)}
                      className={cn(
                        "block w-full rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors",
                        scaleType === type
                          ? "border-primary bg-primary text-primary-foreground"
                          : "bg-background hover:bg-accent",
                      )}
                    >
                      {SCALE_LABELS[type]}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Instrument</SectionLabel>
            <div className="grid grid-cols-3 gap-1.5">
              {(["piano", "guitar", "both"] as Display[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setDisplay(option)}
                  className={cn(
                    "rounded-md border py-1.5 text-xs font-medium capitalize transition-colors",
                    display === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background hover:bg-accent",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Panel>
        </aside>

        {/* center — visualization */}
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-4">
            <h2 className="text-lg font-semibold tracking-tight">
              {prettyNote(tonic)} {SCALE_LABELS[scaleType]}
            </h2>
            <p className="text-sm text-muted-foreground">
              {scale.notes.map(prettyNote).join(" · ")}
            </p>
          </div>

          {showPiano && (
            <div className="rounded-xl border bg-card p-4">
              <SectionLabel>Piano</SectionLabel>
              <div className="mt-3 overflow-x-auto pb-1">
                <Piano startNote="C2" numOctaves={5} scale={scale} />
              </div>
            </div>
          )}

          {showGuitar && (
            <div className="rounded-xl border bg-card p-4">
              <SectionLabel>Guitar</SectionLabel>
              <div className="mt-3">
                <Fretboard scale={scale} numFrets={15} showNoteNames />
              </div>
            </div>
          )}
        </div>

        {/* right — scale info */}
        <aside className="space-y-5">
          <Panel>
            <SectionLabel>Intervallic formula</SectionLabel>
            <p className="font-mono text-sm">{stepFormula(scaleType)}</p>
            <p className="text-xs text-muted-foreground">
              W = whole step, H = half step
            </p>
          </Panel>

          <Panel>
            <SectionLabel>Notes &amp; degrees</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {scale.notes.map((note, index) => (
                <span
                  key={`${note}-${index}`}
                  className={cn(
                    "flex flex-col items-center rounded-md border px-2 py-1",
                    index === 0
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background",
                  )}
                >
                  <span className="text-sm font-semibold">
                    {prettyNote(note)}
                  </span>
                  <span
                    className={cn(
                      "text-[10px]",
                      index === 0
                        ? "text-primary-foreground/75"
                        : "text-muted-foreground",
                    )}
                  >
                    {DEGREE_LABELS[index]}
                  </span>
                </span>
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionLabel>Diatonic chords</SectionLabel>
            {diatonic ? (
              <div className="grid grid-cols-4 gap-1.5">
                {diatonic.map((chord, index) => (
                  <div
                    key={chord.symbol}
                    className="flex flex-col items-center rounded-md border bg-background py-1.5"
                  >
                    <span className="text-[11px] text-muted-foreground">
                      {romanFor(index, chord)}
                    </span>
                    <span className="text-sm font-semibold">
                      {prettyNote(chord.symbol)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pentatonic and blues scales aren&apos;t built from stacked
                diatonic chords.
              </p>
            )}
          </Panel>

          <Panel>
            <SectionLabel>Characteristic tones</SectionLabel>
            <p className="text-sm leading-relaxed">
              {CHARACTERISTIC[scaleType]}
            </p>
          </Panel>

          <Panel>
            <SectionLabel>Suggested progressions</SectionLabel>
            <ul className="space-y-1">
              {PROGRESSIONS[scaleType].map((progression) => (
                <li key={progression} className="font-mono text-sm">
                  {progression}
                </li>
              ))}
            </ul>
          </Panel>

          {SONGS[scaleType] && (
            <Panel>
              <SectionLabel>Songs in this scale</SectionLabel>
              <ul className="space-y-1 text-sm">
                {SONGS[scaleType]?.map((song) => (
                  <li key={song} className="text-muted-foreground">
                    {song}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>

      {/* bottom — playback */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <PlayButton
            label="Ascending"
            icon={<ArrowUp className="size-4" />}
            active={playing === "up"}
            onClick={() => void play("up")}
          />
          <PlayButton
            label="Descending"
            icon={<ArrowDown className="size-4" />}
            active={playing === "down"}
            onClick={() => void play("down")}
          />
          <PlayButton
            label="Both"
            icon={<ArrowUpDown className="size-4" />}
            active={playing === "both"}
            onClick={() => void play("both")}
          />
        </div>

        <div className="flex min-w-[180px] flex-1 items-center gap-3">
          <span className="text-sm text-muted-foreground">Tempo</span>
          <Slider
            min={60}
            max={200}
            step={1}
            value={[tempo]}
            onValueChange={(value) => setTempo(value[0])}
            aria-label="Tempo"
          />
          <span className="w-16 text-sm tabular-nums">{tempo} BPM</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Octaves</span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setOctaves((o) => Math.max(1, o - 1))}
            disabled={octaves <= 1}
            aria-label="Fewer octaves"
          >
            <Minus className="size-4" />
          </Button>
          <span className="w-4 text-center text-sm tabular-nums">
            {octaves}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setOctaves((o) => Math.min(3, o + 1))}
            disabled={octaves >= 3}
            aria-label="More octaves"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <Switch checked={loop} onCheckedChange={setLoop} />
          <span className="flex items-center gap-1 text-sm">
            <Repeat className="size-3.5" />
            Loop
          </span>
        </label>
      </div>
    </div>
  );
}

// --- small building blocks --------------------------------------------------

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border bg-card p-4">{children}</div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

function PlayButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button variant={active ? "default" : "secondary"} onClick={onClick}>
      {active ? <Square className="size-4" /> : icon}
      {active ? "Stop" : label}
    </Button>
  );
}
