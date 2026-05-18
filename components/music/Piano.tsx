"use client";

// Interactive SVG piano keyboard with realistic key proportions.
// White keys render first, black keys overlaid on top with a drop shadow so
// they read as physically raised. Each key has its own hover state.
import { useId, useMemo, useState } from "react";
import type { Chord, Scale } from "@/types/music";
import { playNote } from "@/lib/audio/playback";
import { chromaOf, midiFromPitch, noteFromMidi } from "@/lib/music/notes";
import { scaleContainsNote } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

export interface PianoProps {
  startNote?: string;
  numOctaves?: number;
  highlighted?: Array<{ midi: number; color?: string; label?: string }>;
  onKeyClick?: (midi: number) => void;
  scale?: Scale;
  chord?: Chord;
  className?: string;
}

const ROOT_COLOR = "#dc2626";
const SCALE_COLOR = "#2563eb";
const CHORD_COLOR = "#7c3aed";

// realistic-ish proportions (SVG units)
const WHITE_W = 40;
const WHITE_H = 174;
const BLACK_W = 24;
const BLACK_H = 108;
const TOP = 6;

const WHITE_CHROMA = [0, 2, 4, 5, 7, 9, 11];

function prettyNote(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

export function Piano({
  startNote = "C3",
  numOctaves = 2,
  highlighted,
  onKeyClick,
  scale,
  chord,
  className,
}: PianoProps) {
  const shadowId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  // Build the key list once per range.
  const { whites, blacks, width } = useMemo(() => {
    const startMidi = midiFromPitch(startNote);
    const endMidi = startMidi + numOctaves * 12;
    const whiteKeys: { midi: number; x: number }[] = [];
    const blackKeys: { midi: number; x: number }[] = [];
    const whiteXByMidi = new Map<number, number>();

    let whiteIndex = 0;
    for (let midi = startMidi; midi <= endMidi; midi += 1) {
      const chroma = ((midi % 12) + 12) % 12;
      if (WHITE_CHROMA.includes(chroma)) {
        const x = whiteIndex * WHITE_W;
        whiteKeys.push({ midi, x });
        whiteXByMidi.set(midi, x);
        whiteIndex += 1;
      } else {
        blackKeys.push({ midi, x: 0 });
      }
    }
    for (const black of blackKeys) {
      const leftWhiteX = whiteXByMidi.get(black.midi - 1) ?? 0;
      black.x = leftWhiteX + WHITE_W - BLACK_W / 2;
    }
    return {
      whites: whiteKeys,
      blacks: blackKeys,
      width: whiteIndex * WHITE_W,
    };
  }, [startNote, numOctaves]);

  // Resolve which keys are highlighted and how.
  const highlightByMidi = useMemo(() => {
    const map = new Map<number, { color: string; label: string }>();
    if (highlighted && highlighted.length > 0) {
      for (const item of highlighted) {
        map.set(item.midi, {
          color: item.color ?? SCALE_COLOR,
          label: item.label ?? "",
        });
      }
      return map;
    }
    const all = [...whites, ...blacks];
    for (const key of all) {
      const note = noteFromMidi(key.midi);
      const inScale = scale && scaleContainsNote(scale, note.name);
      const inChord =
        chord && chord.notes.some((n) => chromaOf(n) === chromaOf(note.name));
      if (!inScale && !inChord) continue;
      const root = scale?.tonic ?? chord?.root;
      const isRoot = root != null && chromaOf(note.name) === chromaOf(root);
      map.set(key.midi, {
        color: isRoot ? ROOT_COLOR : inChord ? CHORD_COLOR : SCALE_COLOR,
        label: prettyNote(note.name),
      });
    }
    return map;
  }, [whites, blacks, scale, chord, highlighted]);

  const height = WHITE_H + TOP * 2;

  const handleClick = (midi: number) => {
    void playNote(noteFromMidi(midi), 0.7);
    onKeyClick?.(midi);
  };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("select-none", className)}
      role="img"
      aria-label="Piano keyboard"
    >
      <defs>
        <filter id={shadowId} x="-40%" y="-20%" width="180%" height="160%">
          <feDropShadow
            dx="0"
            dy="2.5"
            stdDeviation="1.6"
            floodColor="#000000"
            floodOpacity="0.45"
          />
        </filter>
      </defs>

      {/* white keys */}
      {whites.map((key) => {
        const highlight = highlightByMidi.get(key.midi);
        const isHovered = hovered === key.midi;
        const note = noteFromMidi(key.midi);
        const fill = highlight
          ? highlight.color
          : isHovered
            ? "#e8eaee"
            : "#fcfcfd";
        return (
          <g
            key={`w-${key.midi}`}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(key.midi)}
            onMouseLeave={() =>
              setHovered((h) => (h === key.midi ? null : h))
            }
            onClick={() => handleClick(key.midi)}
          >
            <rect
              x={key.x + 0.5}
              y={TOP}
              width={WHITE_W - 1}
              height={WHITE_H}
              rx={3}
              fill={fill}
              stroke={isHovered ? "#0ea5e9" : "#9ca3af"}
              strokeWidth={isHovered ? 2 : 1}
            />
            {highlight?.label && (
              <text
                x={key.x + WHITE_W / 2}
                y={TOP + WHITE_H - 18}
                textAnchor="middle"
                className="text-[12px] font-semibold"
                fill="#ffffff"
              >
                {highlight.label}
              </text>
            )}
            {!highlight && note.name === "C" && (
              <text
                x={key.x + WHITE_W / 2}
                y={TOP + WHITE_H - 14}
                textAnchor="middle"
                className="text-[11px] font-medium"
                fill="#9ca3af"
              >
                C{note.octave}
              </text>
            )}
          </g>
        );
      })}

      {/* black keys */}
      <g filter={`url(#${shadowId})`}>
        {blacks.map((key) => {
          const highlight = highlightByMidi.get(key.midi);
          const isHovered = hovered === key.midi;
          const fill = highlight
            ? highlight.color
            : isHovered
              ? "#3f3f46"
              : "#27272a";
          return (
            <g
              key={`b-${key.midi}`}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(key.midi)}
              onMouseLeave={() =>
                setHovered((h) => (h === key.midi ? null : h))
              }
              onClick={() => handleClick(key.midi)}
            >
              <rect
                x={key.x}
                y={TOP}
                width={BLACK_W}
                height={BLACK_H}
                rx={2.5}
                fill={fill}
                stroke={isHovered ? "#0ea5e9" : "#18181b"}
                strokeWidth={isHovered ? 2 : 1}
              />
              {highlight?.label && (
                <text
                  x={key.x + BLACK_W / 2}
                  y={TOP + BLACK_H - 14}
                  textAnchor="middle"
                  className="text-[10px] font-semibold"
                  fill="#ffffff"
                >
                  {highlight.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
