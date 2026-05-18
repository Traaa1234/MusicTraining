"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Mic,
  MicOff,
  Play,
  RotateCcw,
  SkipForward,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playNote, stopAll } from "@/lib/audio/playback";
import { describePitch, useMicPitch } from "@/lib/audio/pitch-detect";
import { midiFromPitch, noteFromMidi } from "@/lib/music/notes";
import { cn } from "@/lib/utils";

// --- melody data ------------------------------------------------------------

interface MelodyNote {
  midi: number;
  beats: number;
}
interface Melody {
  id: string;
  name: string;
  tempo: number;
  notes: MelodyNote[];
}

function seq(spec: [number, number][]): MelodyNote[] {
  return spec.map(([midi, beats]) => ({ midi, beats }));
}

const MELODIES: Melody[] = [
  {
    id: "mary",
    name: "Mary Had a Little Lamb",
    tempo: 96,
    notes: seq([
      [64, 1], [62, 1], [60, 1], [62, 1], [64, 1], [64, 1], [64, 2],
      [62, 1], [62, 1], [62, 2], [64, 1], [67, 1], [67, 2],
    ]),
  },
  {
    id: "twinkle",
    name: "Twinkle Twinkle",
    tempo: 100,
    notes: seq([
      [60, 1], [60, 1], [67, 1], [67, 1], [69, 1], [69, 1], [67, 2],
      [65, 1], [65, 1], [64, 1], [64, 1], [62, 1], [62, 1], [60, 2],
    ]),
  },
  {
    id: "happy-birthday",
    name: "Happy Birthday",
    tempo: 104,
    notes: seq([
      [60, 1], [60, 1], [62, 2], [60, 2], [65, 2], [64, 3],
      [60, 1], [60, 1], [62, 2], [60, 2], [67, 2], [65, 3],
    ]),
  },
  {
    id: "ode-to-joy",
    name: "Ode to Joy",
    tempo: 100,
    notes: seq([
      [64, 1], [64, 1], [65, 1], [67, 1], [67, 1], [65, 1], [64, 1],
      [62, 1], [60, 1], [60, 1], [62, 1], [64, 1], [64, 2], [62, 2],
    ]),
  },
  {
    id: "amazing-grace",
    name: "Amazing Grace",
    tempo: 84,
    notes: seq([
      [55, 1], [60, 2], [64, 1], [60, 1], [64, 2], [62, 1],
      [60, 2], [57, 1], [55, 3],
    ]),
  },
];

const PREVIEW_TEMPO_FACTOR = 0.8; // a touch slower than written

// --- pitch helpers ----------------------------------------------------------

const prettyNote = (name: string) => name.replace(/#/g, "♯");

function noteLabel(midi: number): string {
  const note = noteFromMidi(midi);
  return `${prettyNote(note.name)}${note.octave}`;
}

function centsFromTarget(freq: number, targetMidi: number): number {
  const floatMidi = 69 + 12 * Math.log2(freq / 440);
  return (floatMidi - targetMidi) * 100;
}

function liveColor(cents: number): string {
  const magnitude = Math.abs(cents);
  if (magnitude <= 20) return "#10b981";
  if (magnitude <= 50) return "#f59e0b";
  return "#ef4444";
}

// --- result + scoring -------------------------------------------------------

interface NoteResult {
  midi: number;
  hit: boolean;
  cents: number;
  time: number;
}

interface Score {
  overall: number;
  pitch: number;
  timing: number;
  feedback: string[];
}

function noteScore(result: NoteResult): number {
  if (!result.hit) return 0;
  return Math.max(0, 100 - Math.abs(result.cents) * 1.6);
}

function computeScore(melody: Melody, results: NoteResult[]): Score {
  const pitch = Math.round(
    results.reduce((sum, result) => sum + noteScore(result), 0) /
      results.length,
  );

  // Timing: compare the gaps between hits to the melody's note durations.
  let timing = 100;
  if (results.length >= 3) {
    const gaps: number[] = [];
    const targets: number[] = [];
    for (let i = 0; i < results.length - 1; i += 1) {
      gaps.push(results[i + 1].time - results[i].time);
      targets.push(melody.notes[i].beats);
    }
    const meanGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const meanTarget = targets.reduce((a, b) => a + b, 0) / targets.length;
    if (meanGap > 0 && meanTarget > 0) {
      const error =
        gaps.reduce(
          (sum, gap, i) =>
            sum + Math.abs(gap / meanGap - targets[i] / meanTarget),
          0,
        ) / gaps.length;
      timing = Math.max(0, Math.round(100 - error * 110));
    }
  }

  const overall = Math.round(pitch * 0.75 + timing * 0.25);

  // Feedback.
  const feedback: string[] = [];
  const hits = results.filter((result) => result.hit);
  const avgCents =
    hits.length > 0
      ? hits.reduce((sum, result) => sum + result.cents, 0) / hits.length
      : 0;

  if (avgCents < -12) {
    feedback.push(
      "You're consistently flat — try aiming a little higher, matching the pitch right after playback.",
    );
  } else if (avgCents > 12) {
    feedback.push(
      "You're consistently sharp — ease off slightly to settle onto each note.",
    );
  }

  let worstIndex = -1;
  let worstScore = Infinity;
  results.forEach((result, index) => {
    const score = noteScore(result);
    if (score < worstScore) {
      worstScore = score;
      worstIndex = index;
    }
  });
  if (worstIndex >= 0) {
    const worst = results[worstIndex];
    if (!worst.hit) {
      feedback.push(`You skipped note ${worstIndex + 1} — give it another go.`);
    } else if (Math.abs(worst.cents) > 25) {
      feedback.push(
        `Note ${worstIndex + 1} was your weakest at ${Math.abs(
          Math.round(worst.cents),
        )} cents ${worst.cents < 0 ? "flat" : "sharp"} — replay the melody and target it.`,
      );
    }
  }

  if (timing < 70) {
    feedback.push(
      "Your timing drifted — try humming the rhythm before playing it back.",
    );
  }

  if (feedback.length === 0) {
    feedback.push("Excellent — accurate pitch and steady timing throughout.");
  }
  return { overall, pitch, timing, feedback };
}

// --- piano roll -------------------------------------------------------------

function MelodyRoll({
  melody,
  currentIndex,
  results,
  liveMidi,
  liveCents,
}: {
  melody: Melody;
  currentIndex: number;
  results: NoteResult[];
  liveMidi: number | null;
  liveCents: number;
}) {
  const midis = melody.notes.map((note) => note.midi);
  const lo = Math.min(...midis) - 2;
  const hi = Math.max(...midis) + 2;
  const cellW = 54;
  const height = 168;
  const padX = 16;
  const padY = 20;
  const width = padX * 2 + melody.notes.length * cellW;

  const y = (midi: number) =>
    padY + (1 - (midi - lo) / (hi - lo)) * (height - 2 * padY);

  return (
    <div className="overflow-x-auto rounded-lg border bg-card p-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        className="select-none"
      >
        {melody.notes.map((note, index) => {
          const result = results[index];
          let fill = "var(--color-muted)";
          if (result) fill = result.hit ? liveColor(result.cents) : "#ef4444";
          const isCurrent = index === currentIndex;
          return (
            <g key={index}>
              <rect
                x={padX + index * cellW + 4}
                y={y(note.midi) - 12}
                width={cellW - 8}
                height={24}
                rx={5}
                fill={fill}
                className={cn(!result && !isCurrent && "fill-muted")}
                stroke={isCurrent ? "var(--color-primary)" : "transparent"}
                strokeWidth={isCurrent ? 3 : 0}
              />
              <text
                x={padX + index * cellW + cellW / 2}
                y={y(note.midi) + 4}
                textAnchor="middle"
                className={cn(
                  "text-[11px] font-medium",
                  result || isCurrent
                    ? "fill-white"
                    : "fill-muted-foreground",
                )}
              >
                {noteLabel(note.midi)}
              </text>
            </g>
          );
        })}

        {liveMidi !== null && currentIndex < melody.notes.length && (
          <circle
            cx={padX + currentIndex * cellW + cellW / 2}
            cy={y(liveMidi)}
            r={8}
            fill={liveColor(liveCents)}
            stroke="#ffffff"
            strokeWidth={2}
          />
        )}
      </svg>
    </div>
  );
}

// --- page -------------------------------------------------------------------

type Step = "setup" | "preview" | "listen" | "result";

export default function PlayByEarPage() {
  const [step, setStep] = useState<Step>("setup");
  const [melody, setMelody] = useState<Melody>(MELODIES[0]);
  const [customText, setCustomText] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<NoteResult[]>([]);
  const [live, setLive] = useState<{ midi: number; cents: number } | null>(
    null,
  );
  const [isPreviewing, setIsPreviewing] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [tipsDismissed, setTipsDismissed] = useState(true);

  const { status, pitch, start, stop } = useMicPitch();
  const holdRef = useRef({ armed: true, start: 0, sum: 0, count: 0 });

  useEffect(() => {
    setMounted(true);
    setTipsDismissed(
      localStorage.getItem("ear-train-mic-tips") === "dismissed",
    );
  }, []);

  // Note-by-note detection: confirm a target note once it is held in tune.
  useEffect(() => {
    if (step !== "listen") return;
    const hold = holdRef.current;

    if (!pitch) {
      hold.armed = true;
      hold.start = 0;
      hold.sum = 0;
      hold.count = 0;
      setLive(null);
      return;
    }

    const target = melody.notes[currentIndex];
    if (!target) return;

    const cents = centsFromTarget(pitch.freq, target.midi);
    const floatMidi = 69 + 12 * Math.log2(pitch.freq / 440);
    setLive({ midi: floatMidi, cents });

    if (!hold.armed) return;

    if (Math.abs(cents) <= 50) {
      if (hold.count === 0) hold.start = performance.now();
      hold.sum += cents;
      hold.count += 1;
      if (performance.now() - hold.start >= 450 && hold.count >= 8) {
        const avg = hold.sum / hold.count;
        setResults((prev) => [
          ...prev,
          {
            midi: target.midi,
            hit: true,
            cents: avg,
            time: performance.now(),
          },
        ]);
        setCurrentIndex((index) => index + 1);
        hold.armed = false;
        hold.start = 0;
        hold.sum = 0;
        hold.count = 0;
      }
    } else {
      hold.start = 0;
      hold.sum = 0;
      hold.count = 0;
    }
  }, [pitch, step, currentIndex, melody]);

  // Finish once every note has a result.
  useEffect(() => {
    if (step === "listen" && results.length === melody.notes.length) {
      stop();
      setStep("result");
    }
  }, [step, results.length, melody.notes.length, stop]);

  const score = useMemo(
    () =>
      step === "result" ? computeScore(melody, results) : null,
    [step, melody, results],
  );

  const dismissTips = () => {
    setTipsDismissed(true);
    localStorage.setItem("ear-train-mic-tips", "dismissed");
  };

  const playMelody = (target: Melody) => {
    stopAll();
    setIsPreviewing(true);
    const secPerBeat = 60 / (target.tempo * PREVIEW_TEMPO_FACTOR);
    let elapsed = 0;
    for (const note of target.notes) {
      const at = elapsed;
      window.setTimeout(() => {
        void playNote(noteFromMidi(note.midi), note.beats * secPerBeat * 0.92);
      }, at * 1000);
      elapsed += note.beats * secPerBeat;
    }
    window.setTimeout(() => setIsPreviewing(false), elapsed * 1000);
  };

  const chooseMelody = (chosen: Melody) => {
    setMelody(chosen);
    setStep("preview");
  };

  const startCustom = () => {
    const tokens = customText.trim().split(/[\s,]+/).filter(Boolean);
    if (tokens.length < 2) {
      setCustomError("Enter at least two notes, e.g. C4 D4 E4 G4");
      return;
    }
    try {
      const notes = tokens.map((token) => ({
        midi: noteFromMidi(midiFromPitch(token)).midi,
        beats: 1,
      }));
      setCustomError(null);
      chooseMelody({ id: "custom", name: "Your melody", tempo: 96, notes });
    } catch {
      setCustomError("Couldn't read those notes. Use names like C4, F#3, Bb4.");
    }
  };

  const beginListening = async () => {
    setCurrentIndex(0);
    setResults([]);
    setLive(null);
    holdRef.current = { armed: true, start: 0, sum: 0, count: 0 };
    setStep("listen");
    await start();
  };

  const skipNote = () => {
    const target = melody.notes[currentIndex];
    if (!target) return;
    setResults((prev) => [
      ...prev,
      { midi: target.midi, hit: false, cents: 0, time: performance.now() },
    ]);
    setCurrentIndex((index) => index + 1);
    holdRef.current = { armed: false, start: 0, sum: 0, count: 0 };
  };

  const restart = () => {
    stop();
    stopAll();
    setStep("setup");
    setCurrentIndex(0);
    setResults([]);
    setLive(null);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Play by Ear</h1>
        <p className="text-muted-foreground">
          Hear a melody, then play or sing it back — your mic scores how close
          you get.
        </p>
      </header>

      {mounted && !tipsDismissed && (
        <div className="relative space-y-1.5 rounded-xl border bg-card p-4 pr-10 text-sm">
          <button
            type="button"
            aria-label="Dismiss"
            onClick={dismissTips}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
          <p className="font-medium">Before you start</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>
              Pitch detection works best with a single instrument or voice —
              no backing tracks or multiple notes at once.
            </li>
            <li>Use a quiet room and an external mic if possible.</li>
            <li>
              Tune your instrument first — try the{" "}
              <Link
                href="/tools/tuner"
                className="font-medium text-primary underline underline-offset-2"
              >
                tuner
              </Link>
              .
            </li>
          </ul>
        </div>
      )}

      {/* Step 1 — choose */}
      {step === "setup" && (
        <div className="space-y-5">
          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Pick a melody
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {MELODIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => chooseMelody(option)}
                  className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:border-primary"
                >
                  <span className="font-medium">{option.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {option.notes.length} notes
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Or enter your own
            </h2>
            <div className="flex flex-wrap gap-2">
              <input
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="C4 D4 E4 G4 E4"
                className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button variant="secondary" onClick={startCustom}>
                Use these notes
              </Button>
            </div>
            {customError && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {customError}
              </p>
            )}
          </section>
        </div>
      )}

      {/* Step 2 — preview */}
      {step === "preview" && (
        <div className="space-y-4 rounded-xl border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold">{melody.name}</h2>
          <p className="text-sm text-muted-foreground">
            Listen to the melody, then play it back one note at a time.
          </p>
          <MelodyRoll
            melody={melody}
            currentIndex={-1}
            results={[]}
            liveMidi={null}
            liveCents={0}
          />
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="secondary"
              onClick={() => playMelody(melody)}
              disabled={isPreviewing}
            >
              <Play className="size-4" />
              {isPreviewing ? "Playing…" : "Hear it"}
            </Button>
            <Button onClick={() => void beginListening()}>
              <Mic className="size-4" />
              I&apos;ll play it back
            </Button>
            <Button variant="ghost" onClick={restart}>
              Pick another
            </Button>
          </div>
        </div>
      )}

      {/* Step 3/4 — listen */}
      {step === "listen" && (
        <div className="space-y-4">
          {status === "denied" || status === "error" ? (
            <div className="space-y-3 rounded-xl border bg-card p-6 text-center">
              <p className="text-sm text-red-600 dark:text-red-400">
                {status === "denied"
                  ? "Microphone access was denied. Allow it in your browser to play by ear."
                  : "The microphone could not be started."}
              </p>
              <Button onClick={() => void start()}>
                <Mic className="size-4" />
                Try again
              </Button>
            </div>
          ) : (
            <>
              <MelodyRoll
                melody={melody}
                currentIndex={currentIndex}
                results={results}
                liveMidi={live?.midi ?? null}
                liveCents={live?.cents ?? 0}
              />
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Note {Math.min(currentIndex + 1, melody.notes.length)} of{" "}
                    {melody.notes.length} — play{" "}
                    <span className="font-semibold text-foreground">
                      {melody.notes[currentIndex]
                        ? noteLabel(melody.notes[currentIndex].midi)
                        : "—"}
                    </span>
                  </p>
                  <p
                    className="text-lg font-semibold tabular-nums"
                    style={{ color: live ? liveColor(live.cents) : undefined }}
                  >
                    {live
                      ? `${noteLabel(Math.round(live.midi))} · ${
                          live.cents > 0 ? "+" : ""
                        }${Math.round(live.cents)}¢`
                      : status === "running"
                        ? "Listening…"
                        : "Starting mic…"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => playMelody(melody)}
                    disabled={isPreviewing}
                  >
                    <Play className="size-4" />
                    Replay
                  </Button>
                  <Button variant="outline" onClick={skipNote}>
                    <SkipForward className="size-4" />
                    Skip
                  </Button>
                </div>
              </div>
              <p className="text-center text-xs text-muted-foreground">
                Hold each note steady and in tune to lock it in.
              </p>
            </>
          )}
        </div>
      )}

      {/* Step 4 — result */}
      {step === "result" && score && (
        <div className="space-y-4">
          <div className="rounded-xl border bg-card p-6 text-center">
            <p className="text-sm uppercase tracking-widest text-muted-foreground">
              Overall score
            </p>
            <p className="text-6xl font-semibold tabular-nums">
              {score.overall}
            </p>
            <div className="mt-3 flex justify-center gap-6 text-sm">
              <span>
                <span className="font-semibold tabular-nums">
                  {score.pitch}
                </span>{" "}
                <span className="text-muted-foreground">pitch</span>
              </span>
              <span>
                <span className="font-semibold tabular-nums">
                  {score.timing}
                </span>{" "}
                <span className="text-muted-foreground">timing</span>
              </span>
            </div>
          </div>

          <MelodyRoll
            melody={melody}
            currentIndex={-1}
            results={results}
            liveMidi={null}
            liveCents={0}
          />

          <div className="space-y-2 rounded-xl border bg-card p-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Note by note
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {results.map((result, index) => (
                <span
                  key={index}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-1 text-xs",
                    !result.hit && "border-red-600/40 text-red-600 dark:text-red-400",
                  )}
                >
                  {result.hit ? (
                    <Check className="size-3 text-emerald-600" />
                  ) : (
                    <X className="size-3 text-red-600" />
                  )}
                  {noteLabel(result.midi)}
                  {result.hit && (
                    <span className="text-muted-foreground tabular-nums">
                      {result.cents > 0 ? "+" : ""}
                      {Math.round(result.cents)}¢
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-1.5 rounded-xl border bg-card p-4">
            <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Feedback
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {score.feedback.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => void beginListening()}>
              <RotateCcw className="size-4" />
              Try again
            </Button>
            <Button variant="outline" onClick={restart}>
              New melody
            </Button>
          </div>
        </div>
      )}

      {(step === "listen" || step === "preview") && (
        <div className="flex justify-center">
          <Button variant="ghost" size="sm" onClick={restart}>
            <MicOff className="size-4" />
            End session
          </Button>
        </div>
      )}
    </div>
  );
}
