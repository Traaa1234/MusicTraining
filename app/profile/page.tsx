import Link from "next/link";
import { ProfileSettings } from "@/components/profile/ProfileSettings";
import { Button } from "@/components/ui/button";
import { isBackendConfigured } from "@/lib/backend-config";
import { getActivityStats, getProfile, getSessionUser } from "@/lib/db/queries";
import type { ActivityStats } from "@/lib/db/types";

const TYPE_LABELS: Record<string, string> = {
  interval: "Intervals",
  chord: "Chords",
  scale: "Scales",
};

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-2xl font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function DayChart({ data }: { data: ActivityStats["perDay"] }) {
  const max = Math.max(1, ...data.map((day) => day.attempts));
  const width = 640;
  const height = 130;
  const base = height - 18;
  const gap = 3;
  const barWidth = (width - gap * (data.length - 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
      {data.map((day, index) => {
        const barHeight = (day.attempts / max) * (base - 6);
        return (
          <rect
            key={day.date}
            x={index * (barWidth + gap)}
            y={base - barHeight}
            width={barWidth}
            height={Math.max(barHeight, day.attempts > 0 ? 2 : 0)}
            rx={1.5}
            className="fill-primary"
          />
        );
      })}
      <line
        x1={0}
        y1={base}
        x2={width}
        y2={base}
        className="stroke-border"
        strokeWidth={1}
      />
      <text x={0} y={height - 4} className="fill-muted-foreground text-[10px]">
        30 days ago
      </text>
      <text
        x={width}
        y={height - 4}
        textAnchor="end"
        className="fill-muted-foreground text-[10px]"
      >
        today
      </text>
    </svg>
  );
}

function AccuracyBars({ data }: { data: ActivityStats["accuracyByType"] }) {
  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No exercise attempts yet — head to Train to get started.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {data.map((row) => (
        <div key={row.type} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>{TYPE_LABELS[row.type] ?? row.type}</span>
            <span className="text-muted-foreground tabular-nums">
              {row.pct}% · {row.correct}/{row.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${row.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ProfilePage() {
  if (!isBackendConfigured) {
    return (
      <div className="mx-auto max-w-2xl space-y-3 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Connect Neon and Auth.js to create an account and track your
          progress.
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">
          Sign in to see your stats and settings.
        </p>
        <Button asChild>
          <Link href="/sign-in?next=/profile">Sign in</Link>
        </Button>
      </div>
    );
  }

  const profile = await getProfile();
  const stats = await getActivityStats(user.id);
  const name = profile?.name ?? user.name ?? user.email ?? "Musician";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{name}</h1>
        <p className="text-muted-foreground">{user.email}</p>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          value={`${stats.practiceMinutesThisWeek}m`}
          label="Practice this week"
        />
        <StatCard
          value={`${stats.attemptsThisWeek}`}
          label="Attempts this week"
        />
        <StatCard value={`${stats.streakDays}`} label="Day streak" />
        <StatCard
          value={`${stats.lessonsCompleted}`}
          label="Lessons done"
        />
        <StatCard value={`${stats.dueCount}`} label="Due to review" />
      </div>

      {stats.dueCount > 0 && (
        <Button asChild>
          <Link href="/train/review">
            Review {stats.dueCount} due{" "}
            {stats.dueCount === 1 ? "item" : "items"}
          </Link>
        </Button>
      )}

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Practice — last 30 days
        </h2>
        <DayChart data={stats.perDay} />
      </section>

      <section className="space-y-3 rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          Accuracy by exercise type
        </h2>
        <AccuracyBars data={stats.accuracyByType} />
      </section>

      <ProfileSettings
        initial={{
          instrument: profile?.instrument ?? "",
          skillLevel: profile?.skillLevel ?? "",
          dailyGoal: profile?.dailyGoalMinutes ?? 10,
        }}
      />
    </div>
  );
}
