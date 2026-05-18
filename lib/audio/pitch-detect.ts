// Microphone pitch detection using the McLeod Pitch Method (via pitchy).
//
// Designed for monophonic input — voice or a single-note instrument. Raw
// detections are filtered (clarity + frequency range) and smoothed with a
// short median ring buffer to cut jitter before reaching consumers.
import { useCallback, useEffect, useRef, useState } from "react";
import { PitchDetector } from "pitchy";
import type { NoteName } from "@/types/music";
import { noteFromMidi } from "@/lib/music/notes";

const FFT_SIZE = 2048;
const TARGET_SAMPLE_RATE = 48000;
const MIN_CLARITY = 0.9;
const MIN_FREQ = 70; // Hz — low guitar / bass-vocal range
const MAX_FREQ = 2000; // Hz — top of the practical vocal / guitar range
const RING_SIZE = 5;

type ActiveDetector = {
  context: AudioContext;
  stream: MediaStream;
  running: boolean;
  raf: number;
};

let active: ActiveDetector | null = null;

/** Requests microphone access. Must be called from a user gesture. */
export async function startMicCapture(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

/**
 * Starts analysing a microphone stream. `onPitch` fires (smoothed) only for
 * confident, in-range detections. Any previous detector is stopped first.
 */
export function createPitchDetector(
  stream: MediaStream,
  onPitch: (freq: number, clarity: number) => void,
): void {
  stopPitchDetection();

  // Prefer 48 kHz, but fall back gracefully on hardware that won't allow it.
  let context: AudioContext;
  try {
    context = new AudioContext({ sampleRate: TARGET_SAMPLE_RATE });
  } catch {
    context = new AudioContext();
  }
  const source = context.createMediaStreamSource(stream);
  const analyser = context.createAnalyser();
  analyser.fftSize = FFT_SIZE;
  source.connect(analyser);

  const detector = PitchDetector.forFloat32Array(analyser.fftSize);
  const input = new Float32Array(detector.inputLength);
  const ring: number[] = [];

  const state: ActiveDetector = { context, stream, running: true, raf: 0 };
  active = state;

  const loop = () => {
    if (!state.running) return;
    analyser.getFloatTimeDomainData(input);
    const [freq, clarity] = detector.findPitch(input, context.sampleRate);

    if (clarity > MIN_CLARITY && freq >= MIN_FREQ && freq <= MAX_FREQ) {
      ring.push(freq);
      if (ring.length > RING_SIZE) ring.shift();
      onPitch(median(ring), clarity);
    }
    state.raf = requestAnimationFrame(loop);
  };
  state.raf = requestAnimationFrame(loop);
}

/** Stops the active detector and releases the microphone. */
export function stopPitchDetection(): void {
  if (!active) return;
  active.running = false;
  cancelAnimationFrame(active.raf);
  active.stream.getTracks().forEach((track) => track.stop());
  void active.context.close();
  active = null;
}

export interface PitchReading {
  freq: number;
  /** Nearest MIDI note number. */
  midi: number;
  noteName: NoteName;
  octave: number;
  /** Deviation from the nearest note, -50..+50 cents. */
  cents: number;
}

/** Resolves a frequency to its nearest note plus cents deviation. */
export function describePitch(freq: number): PitchReading {
  const floatMidi = 69 + 12 * Math.log2(freq / 440);
  const midi = Math.round(floatMidi);
  const note = noteFromMidi(midi);
  return {
    freq,
    midi,
    noteName: note.name,
    octave: note.octave,
    cents: Math.round((floatMidi - midi) * 100),
  };
}

export type MicStatus =
  | "idle"
  | "requesting"
  | "running"
  | "denied"
  | "error";

/**
 * React hook wrapping mic capture + pitch detection. Exposes the latest
 * smoothed pitch (or null after a short silence) and start/stop controls.
 */
export function useMicPitch() {
  const [status, setStatus] = useState<MicStatus>("idle");
  const [pitch, setPitch] = useState<{ freq: number; clarity: number } | null>(
    null,
  );
  const lastUpdateRef = useRef(0);

  const start = useCallback(async () => {
    setStatus("requesting");
    try {
      const stream = await startMicCapture();
      createPitchDetector(stream, (freq, clarity) => {
        lastUpdateRef.current = performance.now();
        setPitch({ freq, clarity });
      });
      setStatus("running");
    } catch (error) {
      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");
      setStatus(denied ? "denied" : "error");
    }
  }, []);

  const stop = useCallback(() => {
    stopPitchDetection();
    setPitch(null);
    setStatus("idle");
  }, []);

  // Clear the reading after a brief silence so the UI doesn't freeze.
  useEffect(() => {
    if (status !== "running") return;
    const interval = window.setInterval(() => {
      if (performance.now() - lastUpdateRef.current > 250) {
        setPitch((current) => (current ? null : current));
      }
    }, 120);
    return () => window.clearInterval(interval);
  }, [status]);

  useEffect(() => () => stopPitchDetection(), []);

  return { status, pitch, start, stop };
}
