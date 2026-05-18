import Link from "next/link";
import {
  AudioWaveform,
  Layers,
  ListMusic,
  Ruler,
  Target,
  type LucideIcon,
} from "lucide-react";

type ExerciseCard = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
  ready: boolean;
};

const EXERCISES: ExerciseCard[] = [
  {
    href: "/train/intervals",
    title: "Intervals",
    description: "Name the distance between two notes.",
    icon: Ruler,
    ready: true,
  },
  {
    href: "/train/chords",
    title: "Chord Quality",
    description: "Major, minor, diminished, sevenths and more.",
    icon: Layers,
    ready: true,
  },
  {
    href: "/train/scales",
    title: "Scales",
    description: "Major, minor, modes and pentatonics by ear.",
    icon: AudioWaveform,
    ready: true,
  },
  {
    href: "/train/progressions",
    title: "Progressions",
    description: "Recognise common chord progressions.",
    icon: ListMusic,
    ready: false,
  },
  {
    href: "/train/perfect-pitch",
    title: "Perfect Pitch",
    description: "Identify single notes with no reference.",
    icon: Target,
    ready: false,
  },
];

export default function TrainHub() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Ear Training</h1>
        <p className="text-muted-foreground">
          Pick an exercise. Your level and history are saved as you go.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {EXERCISES.map((exercise) => {
          const Icon = exercise.icon;
          return (
            <Link
              key={exercise.href}
              href={exercise.href}
              className="group flex gap-4 rounded-xl border bg-card p-5 transition-colors hover:border-primary"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <span className="font-semibold">{exercise.title}</span>
                  {!exercise.ready && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">
                  {exercise.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
