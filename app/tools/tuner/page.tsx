"use client";

import { useMemo, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describePitch, useMicPitch } from "@/lib/audio/pitch-detect";
import { cn } from "@/lib/utils";

const INSTRUMENTS = {
  guitar: { label: "Guitar", strings: ["E2", "A2", "D3", "G3", "B3", "E4"] },
  bass: { label: "Bass", strings: ["E1", "A1", "D2", "G2"] },
  violin: { label: "Violin", strings: ["G3", "D4", "A4", "E5"] },
  ukulele: { label: "Ukulele", strings: ["G4", "C4", "E4", "A4"] },
} as const;

type InstrumentId = keyof typeof INSTRUMENTS;

const prettyNote = (name: string) => name.replace(/#/g, "♯");

function tuneColor(cents: number): string {
  const magnitude = Math.abs(cents);
  if (magnitude <= 5) return "#10b981";
  if (magnitude <= 20) return "#f59e0b";
  return "#ef4444";
}

function polar(cx: number, cy: number, r: number, deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

function Gauge({ cents, active }: { cents: number; active: boolean }) {
  const cx = 160;
  const cy = 168;
  const trackR = 132;
  const clamped = Math.max(-50, Math.min(50, cents));
  const color = active ? tuneColor(cents) : "#9ca3af";

  const [ax, ay] = polar(cx, cy, trackR, -50);
  const [bx, by] = polar(cx, cy, trackR, 50);
  const [gx1, gy1] = polar(cx, cy, trackR, -7);
  const [gx2, gy2] = polar(cx, cy, trackR, 7);

  return (
    <svg viewBox="0 0 320 192" className="w-full max-w-sm">
      {/* track */}
      <path
        d={`M ${ax} ${ay} A ${trackR} ${trackR} 0 0 1 ${bx} ${by}`}
        fill="none"
        className="stroke-muted"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* in-tune band */}
      <path
        d={`M ${gx1} ${gy1} A ${trackR} ${trackR} 0 0 1 ${gx2} ${gy2}`}
        fill="none"
        stroke="#10b981"
        strokeWidth={6}
        strokeLinecap="round"
      />
      {/* ticks */}
      {[-50, -25, 0, 25, 50].map((deg) => {
        const [x1, y1] = polar(cx, cy, trackR - 14, deg);
        const [x2, y2] = polar(cx, cy, trackR - 4, deg);
        return (
          <line
            key={deg}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            className="stroke-muted-foreground"
            strokeWidth={deg === 0 ? 3 : 1.5}
          />
        );
      })}
      {/* needle */}
      <g transform={`rotate(${clamped} ${cx} ${cy})`}>
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - trackR + 16}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
        />
      </g>
      <circle cx={cx} cy={cy} r={9} fill={color} />
    </svg>
  );
}

export default function TunerPage() {
  const { status, pitch, start, stop } = useMicPitch();
  const [instrument, setInstrument] = useState<InstrumentId>("guitar");

  const reading = useMemo(
    () => (pitch ? describePitch(pitch.freq) : null),
    [pitch],
  );

  const running = status === "running";
  const detectedLabel = reading
    ? `${reading.noteName}${reading.octave}`
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Tuner</h1>
        <p className="text-muted-foreground">
          A chromatic tuner — play one string at a time and match the needle
          to the centre.
        </p>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(INSTRUMENTS) as InstrumentId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setInstrument(id)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
              instrument === id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-background hover:bg-accent",
            )}
          >
            {INSTRUMENTS[id].label}
          </button>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-6">
        <Gauge cents={reading?.cents ?? 0} active={running && !!reading} />

        <div className="text-center">
          <div
            className="text-5xl font-semibold tabular-nums"
            style={{
              color:
                running && reading
                  ? tuneColor(reading.cents)
                  : undefined,
            }}
          >
            {detectedLabel ? prettyNote(detectedLabel) : "—"}
          </div>
          <div className="mt-1 text-sm text-muted-foreground tabular-nums">
            {reading
              ? `${reading.cents > 0 ? "+" : ""}${reading.cents}¢ ${
                  Math.abs(reading.cents) <= 5
                    ? "· in tune"
                    : reading.cents > 0
                      ? "· sharp"
                      : "· flat"
                }`
              : running
                ? "Listening…"
                : "Microphone off"}
          </div>
        </div>

        {running ? (
          <Button variant="outline" onClick={stop}>
            <MicOff className="size-4" />
            Stop
          </Button>
        ) : (
          <Button onClick={() => void start()}>
            <Mic className="size-4" />
            {status === "requesting" ? "Starting…" : "Start tuning"}
          </Button>
        )}

        {status === "denied" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Microphone access was denied. Allow it in your browser settings to
            use the tuner.
          </p>
        )}
        {status === "error" && (
          <p className="text-sm text-red-600 dark:text-red-400">
            Could not start the microphone.
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {INSTRUMENTS[instrument].label} strings
        </h2>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS[instrument].strings.map((string, index) => {
            const isMatch = detectedLabel === string;
            const inTune = isMatch && Math.abs(reading?.cents ?? 99) <= 5;
            return (
              <span
                key={`${string}-${index}`}
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold",
                  inTune
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : isMatch
                      ? "border-primary bg-primary/10 text-primary"
                      : "bg-background",
                )}
              >
                {prettyNote(string)}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
