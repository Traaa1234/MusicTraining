"use client";

// Gates its children behind a user gesture: browsers won't let audio play
// until the user interacts. Once the Tone.js context is ready, the children
// are revealed.
import { Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAudioContext } from "@/lib/audio/tone-context";
import { useAudioStore } from "@/lib/store/audio-store";

export function AudioGate({ children }: { children: React.ReactNode }) {
  const contextState = useAudioStore((state) => state.contextState);

  if (contextState === "ready") {
    return <>{children}</>;
  }

  const starting = contextState === "starting";
  const errored = contextState === "error";

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed p-10 text-center">
      <Volume2 className="size-8 text-muted-foreground" />
      <div className="space-y-1">
        <p className="font-medium">
          {errored ? "Audio failed to start" : "Audio is off"}
        </p>
        <p className="text-sm text-muted-foreground">
          {errored
            ? "Something went wrong starting the audio engine. Try again."
            : "Browsers require a tap before any sound can play."}
        </p>
      </div>
      <Button onClick={() => void getAudioContext()} disabled={starting}>
        {starting && <Loader2 className="size-4 animate-spin" />}
        {starting ? "Starting…" : errored ? "Retry" : "Tap to enable audio"}
      </Button>
    </div>
  );
}
