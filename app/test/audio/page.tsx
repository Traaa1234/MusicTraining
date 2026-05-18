"use client";

import { useEffect } from "react";
import { AudioGate } from "@/components/audio/AudioGate";
import { InstrumentPicker } from "@/components/audio/InstrumentPicker";
import { Metronome } from "@/components/audio/Metronome";
import { PlayButton } from "@/components/audio/PlayButton";
import { loadInstrument } from "@/lib/audio/sampler";
import { playChord, playNote, playScale } from "@/lib/audio/playback";
import { buildChord } from "@/lib/music/chords";
import { noteFromMidi } from "@/lib/music/notes";
import { buildScale } from "@/lib/music/scales";
import { useAudioStore } from "@/lib/store/audio-store";
import { cn } from "@/lib/utils";

const C4 = noteFromMidi(60);
const C_MAJOR = buildChord("C", "major");
const C_MAJOR_SCALE = buildScale("C", "major");

const STATE_STYLES: Record<string, string> = {
  uninitialized: "bg-muted text-muted-foreground",
  idle: "bg-muted text-muted-foreground",
  starting: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  loading: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  ready: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  error: "bg-red-500/15 text-red-600 dark:text-red-400",
};

function StatePill({ label, state }: { label: string; state: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          STATE_STYLES[state] ?? "bg-muted",
        )}
      >
        {state}
      </span>
    </span>
  );
}

function AudioStateIndicator() {
  const contextState = useAudioStore((s) => s.contextState);
  const instrument = useAudioStore((s) => s.instrument);
  const instrumentLoad = useAudioStore((s) => s.instrumentLoad);

  return (
    <div className="flex flex-wrap gap-2">
      <StatePill label="Audio context" state={contextState} />
      <StatePill label={`Instrument · ${instrument}`} state={instrumentLoad[instrument]} />
    </div>
  );
}

export default function AudioTestPage() {
  const contextState = useAudioStore((s) => s.contextState);
  const instrument = useAudioStore((s) => s.instrument);

  // Preload the selected instrument's samples once audio is live.
  useEffect(() => {
    if (contextState === "ready") {
      void loadInstrument(instrument).catch(() => undefined);
    }
  }, [contextState, instrument]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Audio Test</h1>
        <p className="mt-1 text-muted-foreground">
          Smoke-test the audio playback layer: context, samplers, playback, and
          the metronome.
        </p>
      </header>

      <AudioStateIndicator />

      <AudioGate>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Instrument</span>
            <InstrumentPicker />
          </div>

          <div className="flex flex-wrap gap-3">
            <PlayButton label="Play C4" onPlay={() => playNote(C4)} />
            <PlayButton
              label="Play C major chord"
              onPlay={() => playChord(C_MAJOR)}
            />
            <PlayButton
              label="Play C major scale"
              onPlay={() => playScale(C_MAJOR_SCALE, 1, 160)}
            />
          </div>

          <Metronome />
        </div>
      </AudioGate>
    </div>
  );
}
