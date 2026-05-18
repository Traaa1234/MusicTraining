"use client";

// Interactive circle-of-fifths wheel.
//
// All music theory comes from lib/music/circle-of-fifths.ts and lib/music —
// this component only handles geometry, rendering, and interaction. The ring
// geometry is static, so it is computed once at module load (the strongest
// possible memoization); only highlight classes recompute per render.
import { useMemo, useState } from "react";
import type { NoteName, Scale, ScaleType } from "@/types/music";
import {
  CIRCLE,
  getRelativeMinor,
  keySignature,
} from "@/lib/music/circle-of-fifths";
import { chromaOf, enharmonicEquivalent } from "@/lib/music/notes";
import { getModesOf } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

// --- keys -------------------------------------------------------------------

/** Major keys in circle order, respelled with flats on the flat side. */
const MAJOR_KEYS: NoteName[] = CIRCLE.map((key, i) =>
  i >= 7 && i <= 10 ? enharmonicEquivalent(key) : key,
);
const MINOR_KEYS: NoteName[] = MAJOR_KEYS.map(getRelativeMinor);

type KeyDatum = {
  major: NoteName;
  minor: NoteName;
  count: number;
  accidental: "sharp" | "flat" | "none";
  short: string;
};

const KEY_DATA: KeyDatum[] = MAJOR_KEYS.map((major, i) => {
  const sig = keySignature(major, "major");
  const count = sig.sharps.length || sig.flats.length;
  const accidental =
    sig.sharps.length > 0 ? "sharp" : sig.flats.length > 0 ? "flat" : "none";
  const short =
    count === 0 ? "♮" : `${count}${accidental === "sharp" ? "♯" : "♭"}`;
  return { major, minor: MINOR_KEYS[i], count, accidental, short };
});

const MODE_NAMES: Record<string, string> = {
  major: "Ionian",
  dorian: "Dorian",
  phrygian: "Phrygian",
  lydian: "Lydian",
  mixolydian: "Mixolydian",
  "natural-minor": "Aeolian",
  locrian: "Locrian",
};

/** Renders accidentals with proper musical glyphs. */
export function pretty(name: string): string {
  return name.replace(/#/g, "♯").replace(/b/g, "♭");
}

export function modeName(type: ScaleType): string {
  return MODE_NAMES[type] ?? type;
}

// --- geometry (static — computed once) --------------------------------------

const VIEW = 600;
const MID = VIEW / 2;
const R_MAJOR_OUT = 287;
const R_MAJOR_IN = 200;
const R_MINOR_OUT = 200;
const R_MINOR_IN = 118;
const GAP = 1.4;

/** Rounds to 3 decimals so server and client render byte-identical SVG. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function polar(radius: number, deg: number): [number, number] {
  const a = ((deg - 90) * Math.PI) / 180;
  return [round(MID + radius * Math.cos(a)), round(MID + radius * Math.sin(a))];
}

function sector(
  rIn: number,
  rOut: number,
  startDeg: number,
  endDeg: number,
): string {
  const [x1, y1] = polar(rOut, startDeg);
  const [x2, y2] = polar(rOut, endDeg);
  const [x3, y3] = polar(rIn, endDeg);
  const [x4, y4] = polar(rIn, startDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${rOut} ${rOut} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${rIn} ${rIn} 0 ${large} 0 ${x4} ${y4} Z`;
}

const SEGMENTS = MAJOR_KEYS.map((_, i) => {
  const center = i * 30;
  const start = center - 15 + GAP;
  const end = center + 15 - GAP;
  return {
    majorPath: sector(R_MAJOR_IN, R_MAJOR_OUT, start, end),
    minorPath: sector(R_MINOR_IN, R_MINOR_OUT, start, end),
    majorLabel: polar((R_MAJOR_IN + R_MAJOR_OUT) / 2, center),
    minorLabel: polar((R_MINOR_IN + R_MINOR_OUT) / 2, center),
  };
});

const MODE_SEGMENTS = Array.from({ length: 7 }, (_, i) => {
  const span = 360 / 7;
  const center = i * span;
  const start = center - span / 2 + 1.4;
  const end = center + span / 2 - 1.4;
  return {
    path: sector(R_MINOR_IN, R_MAJOR_OUT, start, end),
    label: polar((R_MINOR_IN + R_MAJOR_OUT) / 2, center),
  };
});

// --- component --------------------------------------------------------------

interface CircleOfFifthsProps {
  selectedKey: NoteName | null;
  onSelectKey: (key: NoteName) => void;
  modeView?: boolean;
  modulationMode?: boolean;
  modulationKeys?: NoteName[];
  onSelectMode?: (scale: Scale) => void;
  className?: string;
}

export function CircleOfFifths({
  selectedKey,
  onSelectKey,
  modeView = false,
  modulationMode = false,
  modulationKeys = [],
  onSelectMode,
  className,
}: CircleOfFifthsProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const selectedIndex = useMemo(
    () =>
      selectedKey === null
        ? -1
        : KEY_DATA.findIndex(
            (k) => chromaOf(k.major) === chromaOf(selectedKey),
          ),
    [selectedKey],
  );

  const modIndices = useMemo(
    () =>
      modulationKeys.map((key) =>
        KEY_DATA.findIndex((k) => chromaOf(k.major) === chromaOf(key)),
      ),
    [modulationKeys],
  );

  const modes = useMemo(
    () => (modeView ? getModesOf(selectedKey ?? "C") : []),
    [modeView, selectedKey],
  );

  const showFifths =
    !modeView && !modulationMode && selectedIndex >= 0;
  const ivIndex = (selectedIndex + 11) % 12;
  const vIndex = (selectedIndex + 1) % 12;

  const tooltip = renderTooltip();

  return (
    <div className={cn("relative mx-auto w-full max-w-[560px]", className)}>
      <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="h-auto w-full select-none">
        <circle
          cx={MID}
          cy={MID}
          r={R_MAJOR_OUT + 5}
          className="fill-none stroke-border"
        />
        {modeView ? renderModeView() : renderWheel()}
      </svg>
      {tooltip}
    </div>
  );

  function renderWheel() {
    return (
      <>
        {SEGMENTS.map((seg, i) => {
          const datum = KEY_DATA[i];
          const isSelected = i === selectedIndex;
          const isFifth = showFifths && (i === ivIndex || i === vIndex);
          const isMod = modulationMode && modIndices.includes(i);
          const isHover = hovered === i;

          let majorClass = "fill-card stroke-border [stroke-width:1.5]";
          if (isHover && !isSelected)
            majorClass = "fill-accent stroke-border [stroke-width:1.5]";
          if (isFifth)
            majorClass = "fill-primary/10 stroke-primary [stroke-width:3.5]";
          if (isSelected)
            majorClass = "fill-primary stroke-primary [stroke-width:2]";
          if (isMod)
            majorClass =
              "fill-primary/15 stroke-primary [stroke-width:3] [stroke-dasharray:7_5]";

          let minorClass = "fill-muted stroke-border [stroke-width:1.5]";
          if (isHover) minorClass = "fill-accent stroke-border [stroke-width:1.5]";
          if (isSelected)
            minorClass = "fill-primary/35 stroke-primary [stroke-width:1.5]";

          const [mx, my] = seg.majorLabel;
          const [nx, ny] = seg.minorLabel;

          return (
            <g
              key={datum.major}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              onClick={() => onSelectKey(datum.major)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectKey(datum.major);
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`${pretty(datum.major)} major, ${datum.short}`}
            >
              <path
                d={seg.majorPath}
                className={cn("transition-[fill]", majorClass)}
              />
              <path
                d={seg.minorPath}
                className={cn("transition-[fill]", minorClass)}
              />
              <text
                x={mx}
                y={my - 7}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "pointer-events-none text-[26px] font-semibold",
                  isSelected ? "fill-primary-foreground" : "fill-foreground",
                )}
              >
                {pretty(datum.major)}
              </text>
              <text
                x={mx}
                y={my + 15}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "pointer-events-none text-[13px]",
                  isSelected
                    ? "fill-primary-foreground/75"
                    : "fill-muted-foreground",
                )}
              >
                {datum.short}
              </text>
              <text
                x={nx}
                y={ny}
                textAnchor="middle"
                dominantBaseline="middle"
                className={cn(
                  "pointer-events-none text-[17px] font-medium",
                  isSelected ? "fill-foreground" : "fill-muted-foreground",
                )}
              >
                {pretty(datum.minor)}m
              </text>
            </g>
          );
        })}
        {renderCenter()}
      </>
    );
  }

  function renderModeView() {
    const tonic = selectedKey ?? "C";
    return (
      <>
        {MODE_SEGMENTS.map((seg, i) => {
          const scale = modes[i];
          if (!scale) return null;
          const isHover = hovered === i;
          const [lx, ly] = seg.label;
          return (
            <g
              key={scale.type}
              className="cursor-pointer"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered((h) => (h === i ? null : h))}
              onClick={() => onSelectMode?.(scale)}
              role="button"
              tabIndex={0}
              aria-label={`${modeName(scale.type)} mode on ${pretty(scale.tonic)}`}
            >
              <path
                d={seg.path}
                className={cn(
                  "transition-[fill] stroke-border [stroke-width:1.5]",
                  isHover ? "fill-primary/15" : "fill-card",
                )}
              />
              <text
                x={lx}
                y={ly - 14}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none text-[13px] font-medium uppercase tracking-wide fill-muted-foreground"
              >
                {modeName(scale.type)}
              </text>
              <text
                x={lx}
                y={ly + 12}
                textAnchor="middle"
                dominantBaseline="middle"
                className="pointer-events-none text-[24px] font-semibold fill-foreground"
              >
                {pretty(scale.tonic)}
              </text>
            </g>
          );
        })}
        <circle
          cx={MID}
          cy={MID}
          r={R_MINOR_IN - 8}
          className="fill-muted/50 stroke-border"
        />
        <text
          x={MID}
          y={MID - 8}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none text-[40px] font-semibold fill-foreground"
        >
          {pretty(tonic)}
        </text>
        <text
          x={MID}
          y={MID + 26}
          textAnchor="middle"
          dominantBaseline="middle"
          className="pointer-events-none text-[13px] uppercase tracking-widest fill-muted-foreground"
        >
          modal center
        </text>
      </>
    );
  }

  function renderCenter() {
    return (
      <>
        <circle
          cx={MID}
          cy={MID}
          r={R_MINOR_IN - 8}
          className="fill-muted/50 stroke-border"
        />
        {selectedIndex >= 0 ? (
          <>
            <text
              x={MID}
              y={MID - 14}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[44px] font-semibold fill-foreground"
            >
              {pretty(KEY_DATA[selectedIndex].major)}
            </text>
            <text
              x={MID}
              y={MID + 20}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[14px] uppercase tracking-widest fill-muted-foreground"
            >
              major
            </text>
            <text
              x={MID}
              y={MID + 42}
              textAnchor="middle"
              dominantBaseline="middle"
              className="pointer-events-none text-[14px] fill-muted-foreground"
            >
              relative: {pretty(KEY_DATA[selectedIndex].minor)} minor
            </text>
          </>
        ) : (
          <text
            x={MID}
            y={MID}
            textAnchor="middle"
            dominantBaseline="middle"
            className="pointer-events-none text-[16px] fill-muted-foreground"
          >
            Select a key
          </text>
        )}
      </>
    );
  }

  function renderTooltip() {
    if (hovered === null) return null;

    if (modeView) {
      const scale = modes[hovered];
      if (!scale) return null;
      const [lx, ly] = MODE_SEGMENTS[hovered].label;
      return (
        <Tooltip x={lx} y={ly}>
          <p className="font-medium">
            {modeName(scale.type)} · {pretty(scale.tonic)}
          </p>
          <p className="text-muted-foreground">
            {scale.notes.map(pretty).join(" ")}
          </p>
        </Tooltip>
      );
    }

    const datum = KEY_DATA[hovered];
    const [lx, ly] = SEGMENTS[hovered].majorLabel;
    const sig =
      datum.count === 0
        ? "no sharps or flats"
        : `${datum.count} ${datum.accidental}${datum.count > 1 ? "s" : ""}`;
    return (
      <Tooltip x={lx} y={ly}>
        <p className="font-medium">
          {pretty(datum.major)} major · {sig}
        </p>
        <p className="text-muted-foreground">
          relative minor: {pretty(datum.minor)}
        </p>
      </Tooltip>
    );
  }
}

function Tooltip({
  x,
  y,
  children,
}: {
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[130%] whitespace-nowrap rounded-md border bg-popover px-2.5 py-1.5 text-xs text-popover-foreground shadow-md"
      style={{ left: `${(x / VIEW) * 100}%`, top: `${(y / VIEW) * 100}%` }}
    >
      {children}
    </div>
  );
}
