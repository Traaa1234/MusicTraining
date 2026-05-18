"use client";

// Streak / accuracy / level summary plus a strip of recent results.
import { Flame, Target, TrendingUp } from "lucide-react";
import { MAX_LEVEL } from "@/lib/store/training-store";
import { cn } from "@/lib/utils";

export interface SessionStatsProps {
  streak: number;
  attempts: number;
  correct: number;
  level: number;
  /** Most-recent results, oldest first (true = correct). */
  recent: boolean[];
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <span>
        <span className="block text-lg font-semibold leading-none tabular-nums">
          {value}
        </span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}

export function SessionStats({
  streak,
  attempts,
  correct,
  level,
  recent,
}: SessionStatsProps) {
  const accuracy =
    attempts > 0 ? `${Math.round((correct / attempts) * 100)}%` : "—";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Stat icon={<Flame className="size-4" />} label="Streak" value={`${streak}`} />
      <Stat
        icon={<Target className="size-4" />}
        label="Accuracy"
        value={accuracy}
      />
      <Stat
        icon={<TrendingUp className="size-4" />}
        label="Level"
        value={`${level} / ${MAX_LEVEL}`}
      />
      {recent.length > 0 && (
        <div className="flex items-center gap-1">
          {recent.map((hit, index) => (
            <span
              key={index}
              className={cn(
                "size-2.5 rounded-full",
                hit ? "bg-emerald-600" : "bg-red-600",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
