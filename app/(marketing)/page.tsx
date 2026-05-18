import Link from "next/link";
import {
  ArrowRight,
  Ear,
  GraduationCap,
  Mic,
  Repeat,
  SlidersHorizontal,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { LandingCircleDemo } from "@/components/marketing/LandingCircleDemo";
import { Button } from "@/components/ui/button";

const FEATURES: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: GraduationCap,
    title: "Interactive lessons",
    description:
      "Theory lessons with embedded piano, fretboard, and quizzes — learn by doing, not just reading.",
  },
  {
    icon: Ear,
    title: "Ear training",
    description:
      "Drill intervals, chord qualities, and scales with instant feedback and adaptive levels.",
  },
  {
    icon: Repeat,
    title: "Spaced repetition",
    description:
      "An SM-2 review queue resurfaces exactly what you're about to forget — the killer retention feature.",
  },
  {
    icon: SlidersHorizontal,
    title: "Music tools",
    description:
      "An interactive circle of fifths, fretboard, scale explorer, and a chromatic tuner.",
  },
  {
    icon: Mic,
    title: "Play by ear",
    description:
      "Mic-based pitch detection listens as you sing or play and scores how close you get.",
  },
  {
    icon: TrendingUp,
    title: "Progress tracking",
    description:
      "Streaks, accuracy by exercise type, and a 30-day practice chart that syncs across devices.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    note: "everything you need to learn",
    features: [
      "All theory lessons",
      "Ear training & tools",
      "Play by ear & tuner",
      "Progress saved on this device",
    ],
    cta: { label: "Start free", href: "/learn" },
    highlight: false,
  },
  {
    name: "Pro",
    price: "$6",
    note: "per month — coming soon",
    features: [
      "Cloud sync across devices",
      "Unlimited spaced-repetition review",
      "Detailed analytics & history",
      "New content first",
    ],
    cta: { label: "Coming soon", href: "/sign-up" },
    highlight: true,
  },
];

export default function LandingPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-20 pb-12">
      {/* Hero */}
      <section className="space-y-6 pt-6 text-center">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Learn music theory and play by ear
        </h1>
        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          Ear Train turns music theory into something you practise, not just
          read — interactive lessons, ear-training drills, and a spaced-
          repetition queue that makes it stick.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/learn">
              Start learning
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/train">Train your ear</Link>
          </Button>
        </div>
      </section>

      {/* Feature grid */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Everything in one place
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="space-y-3 rounded-xl border bg-card p-5"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive demo */}
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight">
            Try the interactive tools
          </h2>
          <p className="mt-1 text-muted-foreground">
            Every concept comes with something you can click. Here&apos;s the
            circle of fifths — give it a spin.
          </p>
        </div>
        <div className="mx-auto max-w-md rounded-xl border bg-card p-6">
          <LandingCircleDemo />
        </div>
      </section>

      {/* Pricing */}
      <section className="space-y-6">
        <h2 className="text-center text-2xl font-semibold tracking-tight">
          Simple pricing
        </h2>
        <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                plan.highlight
                  ? "space-y-4 rounded-xl border-2 border-primary bg-card p-6"
                  : "space-y-4 rounded-xl border bg-card p-6"
              }
            >
              <div>
                <h3 className="font-semibold">{plan.name}</h3>
                <p className="mt-1">
                  <span className="text-3xl font-semibold">{plan.price}</span>{" "}
                  <span className="text-sm text-muted-foreground">
                    {plan.note}
                  </span>
                </p>
              </div>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.features.map((item) => (
                  <li key={item}>· {item}</li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.highlight ? "default" : "outline"}
                className="w-full"
              >
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t pt-8 text-sm">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-muted-foreground">
          <Link href="/learn" className="hover:text-foreground">
            Learn
          </Link>
          <Link href="/train" className="hover:text-foreground">
            Train
          </Link>
          <Link href="/tools/circle-of-fifths" className="hover:text-foreground">
            Tools
          </Link>
          <Link href="/practice/play-by-ear" className="hover:text-foreground">
            Practice
          </Link>
          <Link href="/sign-in" className="hover:text-foreground">
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-muted-foreground">
          Ear Train — a web-first music theory and ear-training app.
        </p>
      </footer>
    </div>
  );
}
