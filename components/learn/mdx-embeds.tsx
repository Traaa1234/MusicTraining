"use client";

// MDX-friendly wrappers around the interactive music components. Lessons use
// simple string props (e.g. <Piano scale="C major" />) and these adapt them
// into the real component APIs.
import { useState } from "react";
import type { ChordQuality, NoteName, ScaleType } from "@/types/music";
import { PlayButton } from "@/components/audio/PlayButton";
import { ChordDiagram } from "@/components/music/ChordDiagram";
import { CircleOfFifths } from "@/components/music/CircleOfFifths";
import { Fretboard } from "@/components/music/Fretboard";
import { Piano } from "@/components/music/Piano";
import { playChord, playNotes } from "@/lib/audio/playback";
import { getChordShapes } from "@/lib/music/chord-shapes";
import { buildChord } from "@/lib/music/chords";
import {
  midiFromPitch,
  noteFromMidi,
  normalizeNoteName,
} from "@/lib/music/notes";
import { buildScale } from "@/lib/music/scales";

function scaleFromSpec(spec: string) {
  const tokens = spec.trim().split(/\s+/);
  return buildScale(
    normalizeNoteName(tokens[0]),
    tokens.slice(1).join("-") as ScaleType,
  );
}

function chordFromSpec(spec: string) {
  const tokens = spec.trim().split(/\s+/);
  return buildChord(
    normalizeNoteName(tokens[0]),
    (tokens.slice(1).join("") || "major") as ChordQuality,
  );
}

export function MdxPiano({
  scale,
  startNote = "C3",
  numOctaves = 2,
}: {
  scale?: string;
  startNote?: string;
  numOctaves?: number;
}) {
  return (
    <div className="my-5 overflow-x-auto rounded-lg border bg-card p-3">
      <Piano
        scale={scale ? scaleFromSpec(scale) : undefined}
        startNote={startNote}
        numOctaves={numOctaves}
      />
    </div>
  );
}

export function MdxFretboard({
  scale,
  chord,
}: {
  scale?: string;
  chord?: string;
}) {
  return (
    <div className="my-5 rounded-lg border bg-card p-3">
      <Fretboard
        scale={scale ? scaleFromSpec(scale) : undefined}
        chord={chord ? chordFromSpec(chord) : undefined}
        numFrets={12}
        showNoteNames
      />
    </div>
  );
}

export function MdxCircleOfFifths() {
  const [selectedKey, setSelectedKey] = useState<NoteName>("C");
  return (
    <div className="my-5 rounded-lg border bg-card p-4">
      <CircleOfFifths
        selectedKey={selectedKey}
        onSelectKey={(key) => {
          setSelectedKey(key);
          void playChord(buildChord(key, "major"), 1);
        }}
      />
    </div>
  );
}

export function MdxPlayButton({
  notes,
  label = "Play",
  chord = false,
}: {
  notes: string;
  label?: string;
  chord?: boolean;
}) {
  const handlePlay = async () => {
    const parsed = notes
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((token) => noteFromMidi(midiFromPitch(token)));
    await playNotes(parsed, {
      gap: chord ? 0 : 0.5,
      duration: chord ? 1.5 : 0.6,
    });
  };

  return (
    <span className="my-2 inline-block">
      <PlayButton label={label} onPlay={handlePlay} variant="secondary" />
    </span>
  );
}

function parseChordSpec(spec: string): { root: NoteName; quality: ChordQuality } {
  const tokens = spec.trim().split(/\s+/);
  const root = normalizeNoteName(tokens[0]);
  const quality = (tokens.slice(1).join("") || "major") as ChordQuality;
  return { root, quality };
}

export function MdxChordDiagram({
  chord,
  shape = 0,
}: {
  chord: string;
  shape?: number;
}) {
  const { root, quality } = parseChordSpec(chord);
  const shapes = getChordShapes(root, quality);
  const picked = shapes[shape] ?? shapes[0];
  if (!picked) return null;
  return (
    <span className="my-3 mr-3 inline-block rounded-lg border bg-card p-3 align-top">
      <ChordDiagram
        shape={picked}
        root={root}
        quality={quality}
        label={chord}
      />
    </span>
  );
}
