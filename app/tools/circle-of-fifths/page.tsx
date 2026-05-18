"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import type { Chord, NoteName, Scale } from "@/types/music";
import {
  CircleOfFifths,
  modeName,
  pretty,
} from "@/components/music/CircleOfFifths";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { playChord, playScale, stopAll } from "@/lib/audio/playback";
import {
  distanceOnCircle,
  keySignature,
} from "@/lib/music/circle-of-fifths";
import { buildChord, diatonicChords } from "@/lib/music/chords";
import { chromaOf } from "@/lib/music/notes";
import { buildScale, getModesOf } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

const PROGRESSIONS: { name: string; degrees: number[] }[] = [
  { name: "I – V – vi – IV", degrees: [0, 4, 5, 3] },
  { name: "ii – V – I", degrees: [1, 4, 0] },
  { name: "I – IV – V", degrees: [0, 3, 4] },
  { name: "I – vi – IV – V", degrees: [0, 5, 3, 4] },
];

const MODULATION_DIFFICULTY = [
  "Same key — no modulation needed.",
  "Very smooth. Neighbouring keys differ by a single note.",
  "Smooth. A common, comfortable modulation.",
  "Moderate. Around three notes change.",
  "A colourful jump — roughly four notes change.",
  "Distant. Only a couple of shared notes.",
  "Maximally distant — the two keys sit a tritone apart.",
];

/** Plays a list of chords back to back. */
async function playProgression(chords: Chord[]): Promise<void> {
  stopAll();
  for (const chord of chords) {
    await playChord(chord, 0.8);
  }
}

function signatureText(key: NoteName): string {
  const sig = keySignature(key, "major");
  if (sig.sharps.length) {
    return `${sig.sharps.length} sharp${sig.sharps.length > 1 ? "s" : ""}`;
  }
  if (sig.flats.length) {
    return `${sig.flats.length} flat${sig.flats.length > 1 ? "s" : ""}`;
  }
  return "no sharps or flats";
}

export default function CircleOfFifthsPage() {
  const [selectedKey, setSelectedKey] = useState<NoteName>("C");
  const [modeView, setModeView] = useState(false);
  const [modulationMode, setModulationMode] = useState(false);
  const [modulationKeys, setModulationKeys] = useState<NoteName[]>([]);
  const [explainerOpen, setExplainerOpen] = useState(false);

  const scale = useMemo(
    () => buildScale(selectedKey, "major"),
    [selectedKey],
  );
  const diatonic = useMemo(() => diatonicChords(scale), [scale]);

  const handleSelectKey = (key: NoteName) => {
    setSelectedKey(key);
    if (modulationMode) {
      setModulationKeys((prev) => [...prev, key].slice(-2));
      return;
    }
    // Play I–IV–V–I in the chosen key.
    const keyChords = diatonicChords(buildScale(key, "major"));
    void playProgression([
      keyChords[0],
      keyChords[3],
      keyChords[4],
      keyChords[0],
    ]);
  };

  const handleSelectMode = (modeScale: Scale) => {
    void playScale(modeScale, 1, 220);
  };

  const toggleModeView = (on: boolean) => {
    setModeView(on);
    if (on) setModulationMode(false);
  };

  const toggleModulation = (on: boolean) => {
    setModulationMode(on);
    setModulationKeys([]);
    if (on) setModeView(false);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Circle of Fifths
        </h1>
        <p className="text-muted-foreground">
          Click any key to hear its I–IV–V–I and explore how it relates to
          every other key.
        </p>
      </header>

      <div className="flex flex-wrap gap-x-8 gap-y-3">
        <ToggleRow
          label="Show modulation distances"
          hint="Click two keys to compare them"
          checked={modulationMode}
          onChange={toggleModulation}
        />
        <ToggleRow
          label="Mode view"
          hint="See the 7 modes of the selected tonic"
          checked={modeView}
          onChange={toggleModeView}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <CircleOfFifths
            selectedKey={selectedKey}
            onSelectKey={handleSelectKey}
            modeView={modeView}
            modulationMode={modulationMode}
            modulationKeys={modulationKeys}
            onSelectMode={handleSelectMode}
          />

          <div className="rounded-xl border bg-card">
            <button
              type="button"
              onClick={() => setExplainerOpen((open) => !open)}
              className="flex w-full items-center justify-between gap-2 px-5 py-3 text-sm font-medium"
            >
              Why the circle works
              <ChevronDown
                className={cn(
                  "size-4 text-muted-foreground transition-transform",
                  explainerOpen && "rotate-180",
                )}
              />
            </button>
            {explainerOpen && (
              <p className="border-t px-5 py-4 text-sm leading-relaxed text-muted-foreground">
                Step clockwise and you add a fifth — and exactly one sharp.
                Each neighbour shares all but one note, so adjacent keys sound
                related and modulate cleanly. A major key and its relative
                minor share a signature, so they ride the same spoke. The
                wheel turns abstract key relationships into plain distance.
              </p>
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          {modulationMode ? (
            <ModulationPanel
              keys={modulationKeys}
              onReset={() => setModulationKeys([])}
            />
          ) : modeView ? (
            <ModesPanel
              tonic={selectedKey}
              onPlay={handleSelectMode}
            />
          ) : (
            <KeyPanel
              selectedKey={selectedKey}
              scale={scale}
              diatonic={diatonic}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// --- toggles ----------------------------------------------------------------

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <Switch checked={checked} onCheckedChange={onChange} />
      <span className="leading-tight">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  );
}

// --- key panel --------------------------------------------------------------

function KeyPanel({
  selectedKey,
  scale,
  diatonic,
}: {
  selectedKey: NoteName;
  scale: Scale;
  diatonic: Chord[];
}) {
  return (
    <div className="space-y-6 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          {pretty(selectedKey)} major
        </h2>
        <p className="text-sm text-muted-foreground">
          {signatureText(selectedKey)}
        </p>
      </div>

      <div className="space-y-2">
        <SectionLabel>Scale notes</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          {scale.notes.map((note, index) => (
            <span
              key={`${note}-${index}`}
              className={cn(
                "rounded-md border px-2.5 py-1 text-sm font-medium",
                index === 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background",
              )}
            >
              {pretty(note)}
            </span>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel>Diatonic chords</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {diatonic.map((chord, index) => (
            <button
              key={chord.symbol}
              type="button"
              onClick={() => void playChord(chord, 1)}
              className="flex flex-col items-center rounded-md border bg-background py-1.5 transition-colors hover:bg-accent"
            >
              <span className="text-[11px] text-muted-foreground">
                {ROMAN[index]}
              </span>
              <span className="text-sm font-semibold">
                {pretty(chord.symbol)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <SectionLabel>Common progressions</SectionLabel>
        <ul className="space-y-1.5">
          {PROGRESSIONS.map((progression) => (
            <li
              key={progression.name}
              className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <span className="text-sm font-medium">{progression.name}</span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void playProgression(
                    progression.degrees.map((degree) => diatonic[degree]),
                  )
                }
              >
                <Play className="size-3.5" />
                Play
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// --- modes panel ------------------------------------------------------------

function ModesPanel({
  tonic,
  onPlay,
}: {
  tonic: NoteName;
  onPlay: (scale: Scale) => void;
}) {
  const modes = useMemo(() => getModesOf(tonic), [tonic]);

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Modes of {pretty(tonic)}
        </h2>
        <p className="text-sm text-muted-foreground">
          The seven scales hidden inside one major key.
        </p>
      </div>
      <ul className="space-y-1.5">
        {modes.map((mode) => (
          <li
            key={mode.type}
            className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
          >
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {modeName(mode.type)} · {pretty(mode.tonic)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {mode.notes.map(pretty).join(" ")}
              </span>
            </span>
            <Button size="sm" variant="secondary" onClick={() => onPlay(mode)}>
              <Play className="size-3.5" />
              Play
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// --- modulation panel -------------------------------------------------------

function ModulationPanel({
  keys,
  onReset,
}: {
  keys: NoteName[];
  onReset: () => void;
}) {
  const [from, to] = keys;
  const ready = keys.length === 2;

  const steps = ready ? distanceOnCircle(from, to) : 0;
  const semitones = ready
    ? Math.min(
        (((chromaOf(to) - chromaOf(from)) % 12) + 12) % 12,
        (((chromaOf(from) - chromaOf(to)) % 12) + 12) % 12,
      )
    : 0;

  return (
    <div className="space-y-5 rounded-xl border bg-card p-5">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">
          Modulation explorer
        </h2>
        <p className="text-sm text-muted-foreground">
          Click two keys on the wheel to measure the move between them.
        </p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <KeySlot label="From" value={keys[0]} />
        <span className="text-muted-foreground">→</span>
        <KeySlot label="To" value={keys[1]} />
      </div>

      {ready ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat value={`${steps}`} label="steps on circle" />
            <Stat value={`${semitones}`} label="semitones apart" />
          </div>
          <p className="rounded-md border bg-background px-3 py-2 text-sm leading-relaxed">
            {MODULATION_DIFFICULTY[steps]}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                void playProgression([
                  buildChord(from, "major"),
                  buildChord(to, "major"),
                ])
              }
            >
              <Play className="size-3.5" />
              Hear the shift
            </Button>
            <Button size="sm" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          {keys.length === 1
            ? "One more — pick the key you want to modulate to."
            : "No keys picked yet."}
        </p>
      )}
    </div>
  );
}

function KeySlot({ label, value }: { label: string; value?: NoteName }) {
  return (
    <span
      className={cn(
        "flex-1 rounded-md border px-3 py-2 text-center",
        value ? "bg-background font-semibold" : "bg-muted text-muted-foreground",
      )}
    >
      <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {value ? `${pretty(value)} major` : "—"}
    </span>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-center">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
