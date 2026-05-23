// components/music/ChordDiagram.tsx
"use client";

// One chord shape, drawn as a standard vertical chord-box diagram.
// Click anywhere on the SVG to hear the chord.
import { useId } from "react";
import type { ChordQuality, NoteName } from "@/types/music";
import { playChord } from "@/lib/audio/playback";
import { buildChord } from "@/lib/music/chords";
import type { ChordShape } from "@/lib/music/chord-shapes";
import { cn } from "@/lib/utils";

const STRING_LABELS = ["E", "A", "D", "G", "B", "e"] as const;
const STRING_COUNT = 6;
const FRET_ROWS = 5;

// SVG geometry (unitless; the SVG scales to its container width).
const STRING_SPACING = 22;
const FRET_HEIGHT = 26;
const PAD_TOP = 28;
const PAD_BOTTOM = 28;
const PAD_LEFT = 26;
const PAD_RIGHT = 26;
const DOT_RADIUS = 9;
const NUT_THICKNESS = 5;

export interface ChordDiagramProps {
  shape: ChordShape;
  root: NoteName;
  quality: ChordQuality;
  label?: string;
  className?: string;
}

export function ChordDiagram({
  shape,
  root,
  quality,
  label,
  className,
}: ChordDiagramProps) {
  const gradId = useId();
  const width = PAD_LEFT + STRING_SPACING * (STRING_COUNT - 1) + PAD_RIGHT;
  const height = PAD_TOP + FRET_HEIGHT * FRET_ROWS + PAD_BOTTOM;
  const showNut = shape.baseFret === 1;
  const stringX = (s: number) => PAD_LEFT + s * STRING_SPACING;
  const fretY = (row: number) => PAD_TOP + row * FRET_HEIGHT;

  const handleClick = () => {
    const chord = buildChord(root, quality);
    void playChord(chord, 1.2);
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn(
        "h-auto w-full max-w-[180px] cursor-pointer select-none transition-opacity hover:opacity-90",
        className,
      )}
      onClick={handleClick}
      role="img"
      aria-label={`${label ?? `${root} ${quality}`} chord diagram`}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--card))" />
          <stop offset="100%" stopColor="hsl(var(--card))" />
        </linearGradient>
      </defs>

      {/* label */}
      {label && (
        <text
          x={width / 2}
          y={PAD_TOP - 14}
          textAnchor="middle"
          className="fill-foreground text-[13px] font-semibold"
        >
          {label}
        </text>
      )}

      {/* nut or top fret bar */}
      {showNut ? (
        <rect
          x={stringX(0) - 1}
          y={PAD_TOP - NUT_THICKNESS / 2}
          width={stringX(STRING_COUNT - 1) - stringX(0) + 2}
          height={NUT_THICKNESS}
          fill="hsl(var(--foreground))"
        />
      ) : (
        <>
          <line
            x1={stringX(0)}
            y1={PAD_TOP}
            x2={stringX(STRING_COUNT - 1)}
            y2={PAD_TOP}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1.5}
          />
          <text
            x={stringX(STRING_COUNT - 1) + 8}
            y={PAD_TOP + 4}
            className="fill-muted-foreground text-[11px] font-medium"
          >
            {shape.baseFret}fr
          </text>
        </>
      )}

      {/* frets */}
      {Array.from({ length: FRET_ROWS }).map((_, i) => (
        <line
          key={`fret-${i}`}
          x1={stringX(0)}
          y1={fretY(i + 1)}
          x2={stringX(STRING_COUNT - 1)}
          y2={fretY(i + 1)}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
      ))}

      {/* strings */}
      {Array.from({ length: STRING_COUNT }).map((_, s) => (
        <line
          key={`string-${s}`}
          x1={stringX(s)}
          y1={PAD_TOP}
          x2={stringX(s)}
          y2={PAD_TOP + FRET_HEIGHT * FRET_ROWS}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
        />
      ))}

      {/* string labels at the bottom */}
      {STRING_LABELS.map((name, s) => (
        <text
          key={`label-${s}`}
          x={stringX(s)}
          y={PAD_TOP + FRET_HEIGHT * FRET_ROWS + 16}
          textAnchor="middle"
          className="fill-muted-foreground text-[10px] font-medium"
        >
          {name}
        </text>
      ))}

      {/* O / × markers above the nut */}
      {shape.positions.map((p, s) => {
        if (p === null) {
          return (
            <text
              key={`mute-${s}`}
              x={stringX(s)}
              y={PAD_TOP - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[12px] font-semibold"
            >
              ×
            </text>
          );
        }
        if (p === 0) {
          return (
            <circle
              key={`open-${s}`}
              cx={stringX(s)}
              cy={PAD_TOP - 10}
              r={4}
              fill="none"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={1.2}
            />
          );
        }
        return null;
      })}

      {/* barre */}
      {shape.barre && (() => {
        const row = shape.barre.fret - shape.baseFret;
        const y = fretY(row) + FRET_HEIGHT / 2;
        const x1 = stringX(shape.barre.fromString);
        const x2 = stringX(shape.barre.toString);
        return (
          <rect
            x={x1 - DOT_RADIUS}
            y={y - DOT_RADIUS}
            width={x2 - x1 + DOT_RADIUS * 2}
            height={DOT_RADIUS * 2}
            rx={DOT_RADIUS}
            fill="hsl(var(--primary))"
            opacity={0.85}
          />
        );
      })()}

      {/* finger dots */}
      {shape.positions.map((fret, s) => {
        if (fret === null || fret === 0) return null;
        const row = fret - shape.baseFret;
        const cx = stringX(s);
        const cy = fretY(row) + FRET_HEIGHT / 2;
        const finger = shape.fingers[s];
        return (
          <g key={`dot-${s}`}>
            <circle
              cx={cx}
              cy={cy}
              r={DOT_RADIUS}
              fill="hsl(var(--primary))"
              stroke="hsl(var(--background))"
              strokeWidth={1.5}
            />
            {finger != null && (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-primary-foreground text-[11px] font-bold"
              >
                {finger}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
