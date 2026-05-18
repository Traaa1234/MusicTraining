"use client";

// Auto-rotating Circle of Fifths used as a silent demo on the landing page.
// It cycles the highlighted key on a timer; clicking a key takes over.
import { useEffect, useState } from "react";
import type { NoteName } from "@/types/music";
import { CircleOfFifths } from "@/components/music/CircleOfFifths";

const KEYS: NoteName[] = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "Db",
  "Ab",
  "Eb",
  "Bb",
  "F",
];

export function LandingCircleDemo() {
  const [index, setIndex] = useState(0);
  const [auto, setAuto] = useState(true);

  useEffect(() => {
    if (!auto) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % KEYS.length);
    }, 2600);
    return () => clearInterval(timer);
  }, [auto]);

  return (
    <CircleOfFifths
      selectedKey={KEYS[index]}
      onSelectKey={(key) => {
        setAuto(false);
        const next = KEYS.indexOf(key);
        if (next >= 0) setIndex(next);
      }}
    />
  );
}
