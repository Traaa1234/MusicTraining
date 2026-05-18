"use client";

// Interactive SVG guitar fretboard.
//
// Everything renders inside a single <svg>. Clicks are resolved by hit-testing
// the cursor against the layout (no per-position DOM nodes). The static board
// geometry is memoized; the highlighted-note marks are a separate layer that
// re-renders when props change.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Chord, NoteName, Scale } from "@/types/music";
import { playNote } from "@/lib/audio/playback";
import { STANDARD_TUNING, getFretboardMap } from "@/lib/music/fretboard";
import { chromaOf } from "@/lib/music/notes";
import { scaleContainsNote } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

export interface FretboardProps {
  tuning?: string[];
  numFrets?: number;
  orientation?: "horizontal" | "vertical";
  highlighted?: Array<{
    string: number;
    fret: number;
    label?: string;
    color?: string;
  }>;
  showNoteNames?: boolean;
  showIntervals?: boolean;
  rootNote?: NoteName;
  onFretClick?: (string: number, fret: number) => void;
  scale?: Scale;
  chord?: Chord;
  leftHanded?: boolean;
  className?: string;
}

const ROOT_COLOR = "#dc2626";
const SCALE_COLOR = "#2563eb";
const CHORD_COLOR = "#7c3aed";
const INLAY_FRETS = [3, 5, 7, 9, 15];
const NUMBER_FRETS = [3, 5, 7, 9, 12, 15];
const INTERVAL_LABELS = [
  "1",
  "♭2",
  "2",
  "♭3",
  "3",
  "4",
  "♭5",
  "5",
  "♭6",
  "6",
  "♭7",
  "7",
];

// layout constants (SVG units)
const FRET = 56;
const STRING = 33;
const OPEN = 42;
const PAD = 24;
const ACROSS_PAD = 24;
const NUMBER_BAND = 24;

function prettyNote(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

type Pt = { x: number; y: number };

interface Layout {
  width: number;
  height: number;
  board: { x: number; y: number; w: number; h: number };
  strings: { x1: number; y1: number; x2: number; y2: number; width: number }[];
  frets: { x1: number; y1: number; x2: number; y2: number; nut: boolean }[];
  inlays: Pt[];
  numbers: { pt: Pt; n: number }[];
  pos: (stringIndex: number, fret: number) => Pt;
  open: (stringIndex: number) => Pt;
  hitTest: (x: number, y: number) => { string: number; fret: number } | null;
}

function buildLayout(
  orientation: "horizontal" | "vertical",
  numStrings: number,
  numFrets: number,
  leftHanded: boolean,
): Layout {
  const nut = PAD + OPEN;
  const alongLen = numFrets * FRET;
  const acrossLen = (numStrings - 1) * STRING;
  const horizontal = orientation === "horizontal";

  const alongCoord = (f: number) => nut + f * FRET;
  const noteAlong = (f: number) => (f === 0 ? PAD + OPEN / 2 : nut + (f - 0.5) * FRET);

  // string ordering: horizontal -> high string on top; vertical -> low on left
  const acrossIndexOf = (stringIndex: number) => {
    let idx = horizontal ? numStrings - 1 - stringIndex : stringIndex;
    if (leftHanded) idx = numStrings - 1 - idx;
    return idx;
  };
  const acrossCoord = (idx: number) => ACROSS_PAD + idx * STRING;

  const place = (along: number, across: number): Pt =>
    horizontal ? { x: along, y: across } : { x: across, y: along };

  const alongExtent = nut + alongLen + PAD;
  const acrossExtent = ACROSS_PAD * 2 + acrossLen;
  const width = horizontal ? alongExtent : acrossExtent + NUMBER_BAND;
  const height = horizontal ? acrossExtent + NUMBER_BAND : alongExtent;

  const board = horizontal
    ? { x: nut, y: ACROSS_PAD, w: alongLen, h: acrossLen }
    : { x: ACROSS_PAD, y: nut, w: acrossLen, h: alongLen };

  const strings = Array.from({ length: numStrings }, (_, stringIndex) => {
    const across = acrossCoord(acrossIndexOf(stringIndex));
    const a = place(PAD, across);
    const b = place(nut + alongLen, across);
    const width = 1 + ((numStrings - 1 - stringIndex) / (numStrings - 1)) * 2.4;
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, width };
  });

  const frets = Array.from({ length: numFrets + 1 }, (_, f) => {
    const a = place(alongCoord(f), ACROSS_PAD);
    const b = place(alongCoord(f), ACROSS_PAD + acrossLen);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y, nut: f === 0 };
  });

  const midAcross = ACROSS_PAD + acrossLen / 2;
  const inlays: Pt[] = [];
  for (const f of INLAY_FRETS) {
    if (f <= numFrets) inlays.push(place(noteAlong(f), midAcross));
  }
  if (numFrets >= 12) {
    inlays.push(place(noteAlong(12), midAcross - STRING * 0.9));
    inlays.push(place(noteAlong(12), midAcross + STRING * 0.9));
  }

  const numberAcross = ACROSS_PAD * 2 + acrossLen - ACROSS_PAD + 14;
  const numbers = NUMBER_FRETS.filter((f) => f <= numFrets).map((n) => ({
    pt: place(noteAlong(n), numberAcross),
    n,
  }));

  const pos = (stringIndex: number, fret: number) =>
    place(noteAlong(fret), acrossCoord(acrossIndexOf(stringIndex)));
  const open = (stringIndex: number) => pos(stringIndex, 0);

  const hitTest = (x: number, y: number) => {
    const along = horizontal ? x : y;
    const across = horizontal ? y : x;
    let fret: number;
    if (along < nut) fret = 0;
    else fret = Math.round((along - nut) / FRET + 0.5);
    if (fret < 0 || fret > numFrets) return null;
    const idx = Math.round((across - ACROSS_PAD) / STRING);
    if (idx < 0 || idx > numStrings - 1) return null;
    const stringIndex = Array.from({ length: numStrings }, (_, s) => s).find(
      (s) => acrossIndexOf(s) === idx,
    );
    if (stringIndex === undefined) return null;
    return { string: stringIndex, fret };
  };

  return { width, height, board, strings, frets, inlays, numbers, pos, open, hitTest };
}

export function Fretboard({
  tuning = STANDARD_TUNING,
  numFrets = 15,
  orientation,
  highlighted,
  showNoteNames = false,
  showIntervals = false,
  rootNote,
  onFretClick,
  scale,
  chord,
  leftHanded = false,
  className,
}: FretboardProps) {
  const gradientId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(query.matches);
    update();
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => {
      query.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  const effectiveOrientation =
    orientation ?? (isMobile ? "vertical" : "horizontal");

  const layout = useMemo(
    () => buildLayout(effectiveOrientation, tuning.length, numFrets, leftHanded),
    [effectiveOrientation, tuning.length, numFrets, leftHanded],
  );

  const board = useMemo(
    () => getFretboardMap(tuning, numFrets),
    [tuning, numFrets],
  );

  const root = rootNote ?? scale?.tonic ?? chord?.root ?? null;

  const marks = useMemo(() => {
    type Mark = { string: number; fret: number; color: string; label: string };
    const result: Mark[] = [];

    const labelFor = (name: NoteName) => {
      if (showIntervals && root) {
        return INTERVAL_LABELS[(chromaOf(name) - chromaOf(root) + 12) % 12];
      }
      if (showNoteNames) return prettyNote(name);
      return "";
    };

    if (highlighted && highlighted.length > 0) {
      for (const mark of highlighted) {
        const note = board[mark.string]?.[mark.fret];
        result.push({
          string: mark.string,
          fret: mark.fret,
          color: mark.color ?? SCALE_COLOR,
          label: mark.label ?? (note ? labelFor(note.name) : ""),
        });
      }
      return result;
    }

    board.forEach((frets, stringIndex) => {
      frets.forEach((note, fret) => {
        const inScale = scale && scaleContainsNote(scale, note.name);
        const inChord =
          chord && chord.notes.some((n) => chromaOf(n) === chromaOf(note.name));
        if (!inScale && !inChord) return;
        const isRoot = root != null && chromaOf(note.name) === chromaOf(root);
        result.push({
          string: stringIndex,
          fret,
          color: isRoot ? ROOT_COLOR : inChord ? CHORD_COLOR : SCALE_COLOR,
          label: labelFor(note.name),
        });
      });
    });
    return result;
  }, [board, scale, chord, highlighted, showNoteNames, showIntervals, root]);

  const handleClick = (event: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * layout.width;
    const y = ((event.clientY - rect.top) / rect.height) * layout.height;
    const hit = layout.hitTest(x, y);
    if (!hit) return;
    const note = board[hit.string]?.[hit.fret];
    if (note) void playNote(note, 0.6);
    onFretClick?.(hit.string, hit.fret);
  };

  const radius = 13.5;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className={cn("h-auto w-full cursor-pointer select-none", className)}
      onClick={handleClick}
      role="img"
      aria-label="Guitar fretboard"
    >
      <defs>
        {/* subtle wood-grain gradient — pure CSS gradient, no image */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4a3a28" />
          <stop offset="34%" stopColor="#3d2e1f" />
          <stop offset="36%" stopColor="#4c3a27" />
          <stop offset="66%" stopColor="#3a2c1d" />
          <stop offset="68%" stopColor="#4a3a28" />
          <stop offset="100%" stopColor="#352a1c" />
        </linearGradient>
      </defs>

      {/* fretboard wood */}
      <rect
        x={layout.board.x}
        y={layout.board.y}
        width={layout.board.w}
        height={layout.board.h}
        fill={`url(#${gradientId})`}
        rx={3}
      />

      {/* inlay markers */}
      {layout.inlays.map((pt, i) => (
        <circle key={`inlay-${i}`} cx={pt.x} cy={pt.y} r={6} fill="#e7e2d6" opacity={0.8} />
      ))}

      {/* frets */}
      {layout.frets.map((fret, i) => (
        <line
          key={`fret-${i}`}
          x1={fret.x1}
          y1={fret.y1}
          x2={fret.x2}
          y2={fret.y2}
          stroke={fret.nut ? "#e5e7eb" : "#9aa0a6"}
          strokeWidth={fret.nut ? 6 : 2.5}
          strokeLinecap="round"
        />
      ))}

      {/* strings */}
      {layout.strings.map((string, i) => (
        <line
          key={`string-${i}`}
          x1={string.x1}
          y1={string.y1}
          x2={string.x2}
          y2={string.y2}
          stroke="#d4d4d8"
          strokeWidth={string.width}
          strokeLinecap="round"
        />
      ))}

      {/* fret numbers */}
      {layout.numbers.map(({ pt, n }) => (
        <text
          key={`num-${n}`}
          x={pt.x}
          y={pt.y}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-muted-foreground text-[13px] font-medium"
        >
          {n}
        </text>
      ))}

      {/* open-string note names */}
      {tuning.map((_, stringIndex) => {
        const open = board[stringIndex]?.[0];
        if (!open) return null;
        const pt = layout.open(stringIndex);
        return (
          <text
            key={`open-${stringIndex}`}
            x={pt.x}
            y={pt.y}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground text-[13px] font-semibold"
          >
            {prettyNote(open.name)}
          </text>
        );
      })}

      {/* highlighted notes — separate layer */}
      <g>
        {marks.map((mark) => {
          const pt = layout.pos(mark.string, mark.fret);
          return (
            <g key={`mark-${mark.string}-${mark.fret}`}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={radius}
                fill={mark.color}
                stroke="#ffffff"
                strokeWidth={1.5}
              />
              {mark.label && (
                <text
                  x={pt.x}
                  y={pt.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="text-[12px] font-semibold"
                  fill="#ffffff"
                >
                  {mark.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
