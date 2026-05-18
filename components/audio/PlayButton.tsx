"use client";

// Reusable button that runs a playback function and reflects playing state.
// Clicking while playing stops all audio.
import { useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { stopAll } from "@/lib/audio/playback";

type PlayButtonProps = {
  label: string;
  /** Async playback action; resolves when playback finishes. */
  onPlay: () => Promise<void>;
  variant?: "default" | "secondary" | "outline";
};

export function PlayButton({ label, onPlay, variant }: PlayButtonProps) {
  const [playing, setPlaying] = useState(false);

  const handleClick = async () => {
    if (playing) {
      stopAll();
      setPlaying(false);
      return;
    }

    setPlaying(true);
    try {
      await onPlay();
    } catch (error) {
      console.error("Playback failed:", error);
    } finally {
      setPlaying(false);
    }
  };

  return (
    <Button onClick={handleClick} variant={variant ?? "default"}>
      {playing ? (
        <Pause className="size-4" />
      ) : (
        <Play className="size-4" />
      )}
      {label}
    </Button>
  );
}
