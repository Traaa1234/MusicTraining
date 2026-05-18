"use client";

// Metronome built on Tone.Transport: a scheduled repeat drives the click, with
// the beat-1 accent louder/higher. Visual beat flashes are synced to the audio
// clock via Tone.getDraw() rather than a free-running interval.
import { useEffect, useRef, useState } from "react";
import * as Tone from "tone";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { getAudioContext } from "@/lib/audio/tone-context";
import { cn } from "@/lib/utils";

const TIME_SIGNATURES = {
  "2/4": { beats: 2, subdivision: "4n" },
  "3/4": { beats: 3, subdivision: "4n" },
  "4/4": { beats: 4, subdivision: "4n" },
  "6/8": { beats: 6, subdivision: "8n" },
} as const;

type TimeSignature = keyof typeof TIME_SIGNATURES;

export function Metronome() {
  const [bpm, setBpm] = useState(120);
  const [signature, setSignature] = useState<TimeSignature>("4/4");
  const [running, setRunning] = useState(false);
  const [activeBeat, setActiveBeat] = useState(-1);

  const clickRef = useRef<Tone.MembraneSynth | null>(null);
  const eventIdRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const beatsRef = useRef(4);

  const { beats } = TIME_SIGNATURES[signature];
  beatsRef.current = beats;

  // Tempo can change live while the metronome runs.
  useEffect(() => {
    if (running) Tone.getTransport().bpm.value = bpm;
  }, [bpm, running]);

  // Stop the transport and dispose the click synth on unmount.
  useEffect(() => {
    return () => {
      const transport = Tone.getTransport();
      if (eventIdRef.current !== null) transport.clear(eventIdRef.current);
      transport.stop();
      clickRef.current?.dispose();
    };
  }, []);

  const start = async () => {
    await getAudioContext();
    if (!clickRef.current) {
      clickRef.current = new Tone.MembraneSynth({ volume: -4 }).toDestination();
    }

    const transport = Tone.getTransport();
    transport.bpm.value = bpm;
    beatCountRef.current = 0;

    eventIdRef.current = transport.scheduleRepeat((time) => {
      const beat = beatCountRef.current % beatsRef.current;
      const accent = beat === 0;
      clickRef.current?.triggerAttackRelease(
        accent ? "C3" : "C2",
        "16n",
        time,
        accent ? 1 : 0.5,
      );
      Tone.getDraw().schedule(() => setActiveBeat(beat), time);
      beatCountRef.current += 1;
    }, TIME_SIGNATURES[signature].subdivision);

    transport.start();
    setRunning(true);
  };

  const stop = () => {
    const transport = Tone.getTransport();
    if (eventIdRef.current !== null) {
      transport.clear(eventIdRef.current);
      eventIdRef.current = null;
    }
    transport.stop();
    transport.position = 0;
    setRunning(false);
    setActiveBeat(-1);
  };

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Metronome</h3>
        <span className="text-sm tabular-nums text-muted-foreground">
          {bpm} BPM
        </span>
      </div>

      <Slider
        min={40}
        max={240}
        step={1}
        value={[bpm]}
        onValueChange={(value) => setBpm(value[0])}
        aria-label="Tempo in beats per minute"
      />

      <div className="flex items-center gap-3">
        <Select
          value={signature}
          onValueChange={(value) => setSignature(value as TimeSignature)}
          disabled={running}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.keys(TIME_SIGNATURES).map((sig) => (
              <SelectItem key={sig} value={sig}>
                {sig}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={running ? stop : () => void start()}
          variant={running ? "secondary" : "default"}
        >
          {running ? (
            <Square className="size-4" />
          ) : (
            <Play className="size-4" />
          )}
          {running ? "Stop" : "Start"}
        </Button>
      </div>

      <div className="flex gap-2">
        {Array.from({ length: beats }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "size-5 rounded-full border transition-colors duration-75",
              index === activeBeat
                ? index === 0
                  ? "border-primary bg-primary"
                  : "border-foreground bg-foreground"
                : "bg-muted",
            )}
          />
        ))}
      </div>
    </div>
  );
}
