"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, Copy, GripVertical, Play, Trash2, X } from "lucide-react";
import type { Chord, NoteName } from "@/types/music";
import { InstrumentPicker } from "@/components/audio/InstrumentPicker";
import { Button } from "@/components/ui/button";
import { playChord, stopAll } from "@/lib/audio/playback";
import { diatonicChords } from "@/lib/music/chords";
import { SHARP_NOTE_NAMES, chromaOf } from "@/lib/music/notes";
import { buildScale } from "@/lib/music/scales";
import { cn } from "@/lib/utils";

const ROMAN = ["I", "ii", "iii", "IV", "V", "vi", "vii°"];

// Common follow-on chords by scale degree — blends circle-of-fifths root
// motion (V→I, ii→V) with everyday functional moves.
const NEXT_CHORDS: Record<number, number[]> = {
  0: [3, 4, 5],
  1: [4, 0, 6],
  2: [5, 3, 0],
  3: [4, 0, 1],
  4: [0, 5, 3],
  5: [1, 3, 4],
  6: [0, 2, 5],
};
const START_CHORDS = [0, 3, 4];

const prettyChord = (symbol: string) =>
  symbol.replace(/#/g, "♯").replace(/b/g, "♭");

interface Entry {
  uid: string;
  degree: number;
}

export default function ChordProgressionBuilderPage() {
  return (
    <Suspense fallback={null}>
      <Builder />
    </Suspense>
  );
}

function Builder() {
  const params = useSearchParams();
  const [keyName, setKeyName] = useState<NoteName>("C");
  const [progression, setProgression] = useState<Entry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const restored = useRef(false);

  // Restore state from the share URL once on mount.
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    const urlKey = params.get("key");
    if (urlKey && SHARP_NOTE_NAMES.includes(urlKey as NoteName)) {
      setKeyName(urlKey as NoteName);
    }
    const urlChords = params.get("chords");
    if (urlChords) {
      const entries = urlChords
        .split(",")
        .map((value) => Number(value))
        .filter((degree) => Number.isInteger(degree) && degree >= 0 && degree <= 6)
        .map((degree) => ({ uid: crypto.randomUUID(), degree }));
      setProgression(entries);
    }
  }, [params]);

  const diatonic = useMemo(
    () => diatonicChords(buildScale(keyName, "major")),
    [keyName],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const add = (degree: number) =>
    setProgression((prev) => [...prev, { uid: crypto.randomUUID(), degree }]);
  const remove = (uid: string) =>
    setProgression((prev) => prev.filter((entry) => entry.uid !== uid));
  const clear = () => setProgression([]);

  const handleDragStart = (event: DragStartEvent) =>
    setActiveId(String(event.active.id));

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;
    const activeKey = String(active.id);

    if (activeKey.startsWith("palette:")) {
      add(Number(activeKey.slice(8)));
      return;
    }
    const overKey = String(over.id);
    if (activeKey !== overKey && overKey !== "slot") {
      setProgression((prev) => {
        const from = prev.findIndex((e) => e.uid === activeKey);
        const to = prev.findIndex((e) => e.uid === overKey);
        if (from < 0 || to < 0) return prev;
        return arrayMove(prev, from, to);
      });
    }
  };

  const playProgression = async () => {
    if (progression.length === 0) return;
    stopAll();
    for (const entry of progression) {
      await playChord(diatonic[entry.degree], 0.8);
    }
  };

  const copyLink = async () => {
    const url = `${window.location.origin}/tools/chord-progression-builder?key=${keyName}&chords=${progression
      .map((e) => e.degree)
      .join(",")}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const lastDegree =
    progression.length > 0
      ? progression[progression.length - 1].degree
      : null;
  const suggestions =
    lastDegree === null ? START_CHORDS : (NEXT_CHORDS[lastDegree] ?? []);

  const overlayChord =
    activeId?.startsWith("palette:")
      ? diatonic[Number(activeId.slice(8))]
      : (() => {
          const entry = progression.find((e) => e.uid === activeId);
          return entry ? diatonic[entry.degree] : null;
        })();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          Chord Progression Builder
        </h1>
        <p className="text-muted-foreground">
          Drag diatonic chords into a progression, hear it, and share it.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-4 rounded-xl border bg-card p-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Key
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SHARP_NOTE_NAMES.map((note) => (
              <button
                key={note}
                type="button"
                onClick={() => setKeyName(note)}
                className={cn(
                  "min-w-9 rounded-md border px-2 py-1 text-sm font-medium transition-colors",
                  chromaOf(keyName) === chromaOf(note)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )}
              >
                {prettyChord(note)}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Instrument
          </p>
          <InstrumentPicker />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* palette */}
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Diatonic chords — {prettyChord(keyName)} major
          </h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {diatonic.map((chord, degree) => (
              <PaletteChip
                key={chord.symbol}
                degree={degree}
                roman={ROMAN[degree]}
                chord={chord}
                onAdd={() => add(degree)}
              />
            ))}
          </div>
        </section>

        {/* progression slot */}
        <section className="space-y-2">
          <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Your progression
          </h2>
          <SortableContext
            items={progression.map((e) => e.uid)}
            strategy={rectSortingStrategy}
          >
            <ProgressionSlot
              progression={progression}
              diatonic={diatonic}
              onRemove={remove}
            />
          </SortableContext>
        </section>

        <DragOverlay>
          {overlayChord ? (
            <div className="flex flex-col items-center rounded-lg border bg-card px-3 py-2 shadow-lg">
              <span className="text-sm font-semibold">
                {prettyChord(overlayChord.symbol)}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void playProgression()} disabled={progression.length === 0}>
          <Play className="size-4" fill="currentColor" />
          Play progression
        </Button>
        <Button
          variant="outline"
          onClick={clear}
          disabled={progression.length === 0}
        >
          <Trash2 className="size-4" />
          Clear
        </Button>
        <Button
          variant="outline"
          onClick={() => void copyLink()}
          disabled={progression.length === 0}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy share link"}
        </Button>
      </div>

      {/* suggestions */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          {lastDegree === null
            ? "Good chords to start on"
            : "Common next chords"}
        </h2>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((degree) => (
            <button
              key={degree}
              type="button"
              onClick={() => add(degree)}
              className="flex items-center gap-2 rounded-md border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary hover:bg-accent"
            >
              <span className="text-xs text-muted-foreground">
                {ROMAN[degree]}
              </span>
              <span className="font-semibold">
                {prettyChord(diatonic[degree].symbol)}
              </span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Suggestions follow circle-of-fifths root motion and common
          functional moves.
        </p>
      </section>
    </div>
  );
}

// --- palette chip (draggable) -----------------------------------------------

function PaletteChip({
  degree,
  roman,
  chord,
  onAdd,
}: {
  degree: number;
  roman: string;
  chord: Chord;
  onAdd: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${degree}`,
  });
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onAdd}
      aria-label={`Add ${chord.symbol}`}
      className={cn(
        "flex flex-col items-center rounded-lg border bg-background py-2 transition-colors hover:border-primary hover:bg-accent",
        isDragging && "opacity-40",
      )}
      {...listeners}
      {...attributes}
    >
      <span className="text-[11px] text-muted-foreground">{roman}</span>
      <span className="text-sm font-semibold">
        {prettyChord(chord.symbol)}
      </span>
    </button>
  );
}

// --- progression slot (droppable) -------------------------------------------

function ProgressionSlot({
  progression,
  diatonic,
  onRemove,
}: {
  progression: Entry[];
  diatonic: Chord[];
  onRemove: (uid: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "slot" });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-24 flex-wrap items-center gap-2 rounded-xl border-2 border-dashed p-3 transition-colors",
        isOver ? "border-primary bg-accent/50" : "border-border",
      )}
    >
      {progression.length === 0 ? (
        <p className="w-full text-center text-sm text-muted-foreground">
          Drag chords here, or tap one above to add it.
        </p>
      ) : (
        progression.map((entry) => (
          <ProgressionChip
            key={entry.uid}
            entry={entry}
            chord={diatonic[entry.degree]}
            roman={ROMAN[entry.degree]}
            onRemove={() => onRemove(entry.uid)}
          />
        ))
      )}
    </div>
  );
}

// --- progression chip (sortable) --------------------------------------------

function ProgressionChip({
  entry,
  chord,
  roman,
  onRemove,
}: {
  entry: Entry;
  chord: Chord;
  roman: string;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entry.uid });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-1 rounded-lg border bg-card px-2 py-1.5",
        isDragging && "opacity-50",
      )}
    >
      <button
        type="button"
        aria-label="Reorder chord"
        className="cursor-grab touch-none text-muted-foreground"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="size-4" />
      </button>
      <span className="flex flex-col items-center px-1">
        <span className="text-[10px] text-muted-foreground">{roman}</span>
        <span className="text-sm font-semibold">
          {prettyChord(chord.symbol)}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Remove ${chord.symbol}`}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
