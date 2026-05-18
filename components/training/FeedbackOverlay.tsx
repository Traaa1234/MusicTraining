"use client";

// Brief green/red flash shown over the exercise area after an answer.
// Purely visual — comparison playback is handled by the exercise hook.
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FeedbackOverlayProps {
  /** A new object each answer; null clears the overlay. */
  feedback: { state: "correct" | "wrong" } | null;
}

export function FeedbackOverlay({ feedback }: FeedbackOverlayProps) {
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (!feedback) {
      setFlashing(false);
      return;
    }
    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), 850);
    return () => clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;
  const correct = feedback.state === "correct";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl transition-opacity duration-500",
        flashing ? "opacity-100" : "opacity-0",
        correct ? "bg-emerald-600/20" : "bg-red-600/20",
      )}
    >
      <div
        className={cn(
          "flex size-20 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300",
          flashing ? "scale-100" : "scale-90",
          correct ? "bg-emerald-600" : "bg-red-600",
        )}
      >
        {correct ? <Check className="size-10" /> : <X className="size-10" />}
      </div>
    </div>
  );
}
