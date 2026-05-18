"use client";

// Shared layout + logic for every ear-training exercise. A page just renders
// <ExerciseShell kind="intervals" /> — this component drives generation,
// playback, scoring, feedback, persistence and settings via the exercise
// config and the training store.
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Play, Settings2, X } from "lucide-react";
import { playNotes, stopAll } from "@/lib/audio/playback";
import { noteFromMidi } from "@/lib/music/notes";
import { CONFIGS, type Exercise, type ExerciseConfig } from "@/lib/training/config";
import {
  type DirectionSetting,
  type ExerciseKind,
  type KindState,
  MAX_LEVEL,
  type RootMode,
  useTrainingStore,
} from "@/lib/store/training-store";
import {
  type InstrumentName,
  useAudioStore,
} from "@/lib/store/audio-store";
import { AnswerGrid } from "@/components/training/AnswerGrid";
import { FeedbackOverlay } from "@/components/training/FeedbackOverlay";
import { SessionStats } from "@/components/training/SessionStats";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { qualityFromOutcome } from "@/lib/srs/sm2";
import { logExercise } from "@/lib/db/actions";
import { cn } from "@/lib/utils";

const DB_EXERCISE_TYPE: Record<ExerciseKind, "interval" | "chord" | "scale"> =
  {
    intervals: "interval",
    chords: "chord",
    scales: "scale",
  };

type Feedback = {
  state: "correct" | "wrong";
  correctId: string;
  correctLabel: string;
  chosenId: string;
};

export function ExerciseShell({ kind }: { kind: ExerciseKind }) {
  const config = CONFIGS[kind];

  const state = useTrainingStore((store) => store[kind]);
  const recordAttempt = useTrainingStore((store) => store.recordAttempt);
  const setLevel = useTrainingStore((store) => store.setLevel);
  const updateSettings = useTrainingStore((store) => store.updateSettings);
  const resetSession = useTrainingStore((store) => store.resetSession);

  const { level, attempts, correct, streak, history, settings } = state;

  const [current, setCurrent] = useState<Exercise | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const indexRef = useRef(0);
  const questionStartRef = useRef(0);

  // Load persisted progress, then start a clean session.
  useEffect(() => {
    let active = true;
    Promise.resolve(useTrainingStore.persist.rehydrate()).then(() => {
      if (active) resetSession(kind);
    });
    return () => {
      active = false;
      stopAll();
    };
  }, [kind, resetSession]);

  const unlockedIds = useMemo(
    () =>
      new Set(
        config.answers
          .filter((answer) => answer.unlockLevel <= level)
          .map((answer) => answer.id),
      ),
    [config, level],
  );

  const startExercise = (autoPlay: boolean) => {
    let exercise = config.generate(level, settings, indexRef.current);
    indexRef.current += 1;
    if (
      current &&
      config.answerIdOf(exercise) === config.answerIdOf(current)
    ) {
      exercise = config.generate(level, settings, indexRef.current);
      indexRef.current += 1;
    }
    setCurrent(exercise);
    setFeedback(null);
    questionStartRef.current = performance.now();
    if (autoPlay) {
      stopAll();
      void config.play(exercise);
    }
  };

  const handlePlay = () => {
    if (current) {
      stopAll();
      void config.play(current);
    } else {
      startExercise(true);
    }
  };

  const handleNext = () => startExercise(true);

  const handleAnswer = (id: string) => {
    if (!current || feedback) return;
    const correctId = config.answerIdOf(current);
    const isCorrect = id === correctId;
    const correctLabel = config.promptLabelOf(current);

    recordAttempt(kind, {
      promptId: correctId,
      promptLabel: correctLabel,
      answerId: id,
      answerLabel: config.answers.find((a) => a.id === id)?.label ?? id,
      correct: isCorrect,
      timestamp: Date.now(),
    });
    setFeedback({
      state: isCorrect ? "correct" : "wrong",
      correctId,
      correctLabel,
      chosenId: id,
    });

    // Best-effort cloud sync — records the attempt and advances SRS.
    const exerciseType = DB_EXERCISE_TYPE[kind];
    void logExercise({
      exerciseType,
      itemKey: `${exerciseType}:${correctId}`,
      question: { kind, answerId: correctId, answerLabel: correctLabel },
      userAnswer: id,
      correct: isCorrect,
      responseTimeMs: Math.round(performance.now() - questionStartRef.current),
      quality: qualityFromOutcome(isCorrect),
    });

    if (isCorrect) {
      void playNotes([noteFromMidi(84), noteFromMidi(88), noteFromMidi(91)], {
        gap: 0.07,
        duration: 0.35,
        velocity: 0.5,
      });
    } else {
      void config.playComparison(current, id);
    }
  };

  // Keyboard shortcuts via a ref so the listener subscribes only once.
  const keysRef = useRef({ play: handlePlay, next: handleNext, answered: false });
  keysRef.current = {
    play: handlePlay,
    next: handleNext,
    answered: feedback !== null,
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        event.preventDefault();
        keysRef.current.play();
      } else if (event.code === "Enter" && keysRef.current.answered) {
        event.preventDefault();
        keysRef.current.next();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const accuracyPct =
    attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
  const recent = history.slice(-12).map((entry) => entry.correct);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {config.title}
          </h1>
          <p className="text-muted-foreground">{config.tagline}</p>
        </div>
        <Button variant="outline" onClick={() => setSettingsOpen(true)}>
          <Settings2 className="size-4" />
          Settings
        </Button>
      </header>

      <SessionStats
        streak={streak}
        attempts={attempts}
        correct={correct}
        level={level}
        recent={recent}
      />

      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Session accuracy</span>
          <span className="tabular-nums">
            {correct} / {attempts}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300"
            style={{ width: `${accuracyPct}%` }}
          />
        </div>
      </div>

      <div className="relative space-y-5 overflow-hidden rounded-xl border bg-card p-6">
        <p className="text-center text-sm text-muted-foreground">
          {config.instruction}
        </p>

        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handlePlay}
            aria-label={current ? "Replay" : "Play"}
            className="flex size-24 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            <Play className="size-11 translate-x-0.5" fill="currentColor" />
          </button>
          <p className="text-xs text-muted-foreground">
            Tap or press{" "}
            <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">
              Space
            </kbd>{" "}
            {current ? "to replay" : "to start"}
          </p>
        </div>

        <AnswerGrid
          answers={config.answers}
          unlockedIds={unlockedIds}
          feedback={
            feedback
              ? { correctId: feedback.correctId, chosenId: feedback.chosenId }
              : null
          }
          locked={!current || feedback !== null}
          onAnswer={handleAnswer}
        />

        <FeedbackOverlay
          feedback={feedback ? { state: feedback.state } : null}
        />
      </div>

      {feedback && (
        <div className="flex items-center justify-between gap-4 rounded-xl border bg-card px-5 py-3">
          <p className="text-sm">
            {feedback.state === "correct" ? (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                Correct!
              </span>
            ) : (
              <>
                <span className="font-medium text-red-600 dark:text-red-400">
                  Not quite.
                </span>{" "}
                <span className="text-muted-foreground">
                  The answer was{" "}
                </span>
                <span className="font-medium">{feedback.correctLabel}</span>
              </>
            )}
          </p>
          <Button onClick={handleNext}>
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {settingsOpen && (
        <SettingsDrawer
          kind={kind}
          config={config}
          state={state}
          onClose={() => setSettingsOpen(false)}
          onLevel={(value) => setLevel(kind, value)}
          onSettings={(patch) => updateSettings(kind, patch)}
        />
      )}
    </div>
  );
}

// --- settings drawer --------------------------------------------------------

const DIRECTION_OPTIONS: { value: DirectionSetting; label: string }[] = [
  { value: "ascending", label: "Ascending" },
  { value: "descending", label: "Descending" },
  { value: "harmonic", label: "Harmonic" },
  { value: "mixed", label: "Mixed" },
];

const ROOT_OPTIONS: { value: RootMode; label: string }[] = [
  { value: "fixed", label: "Fixed C" },
  { value: "random", label: "Random" },
  { value: "chromatic", label: "Chromatic" },
];

const INSTRUMENT_OPTIONS: { value: InstrumentName; label: string }[] = [
  { value: "piano", label: "Piano" },
  { value: "guitar", label: "Guitar" },
  { value: "synth", label: "Synth" },
];

function SettingsDrawer({
  kind,
  config,
  state,
  onClose,
  onLevel,
  onSettings,
}: {
  kind: ExerciseKind;
  config: ExerciseConfig;
  state: KindState;
  onClose: () => void;
  onLevel: (value: number) => void;
  onSettings: (patch: Partial<KindState["settings"]>) => void;
}) {
  const instrument = useAudioStore((store) => store.instrument);
  const setInstrument = useAudioStore((store) => store.setInstrument);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] space-y-6 overflow-y-auto border-l bg-background p-5 shadow-xl">
        <header className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close settings"
            onClick={onClose}
          >
            <X className="size-5" />
          </Button>
        </header>

        <Field label={`Level — gates which answers appear`}>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: MAX_LEVEL }, (_, i) => i + 1).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => onLevel(value)}
                className={cn(
                  "rounded-md border py-1.5 text-sm font-medium transition-colors",
                  state.level === value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-accent",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </Field>

        {config.hasDirection && (
          <Field label="Direction">
            <OptionButtons
              options={DIRECTION_OPTIONS}
              value={state.settings.direction}
              onChange={(value) => onSettings({ direction: value })}
            />
          </Field>
        )}

        <Field label="Root randomization">
          <OptionButtons
            options={ROOT_OPTIONS}
            value={state.settings.rootMode}
            onChange={(value) => onSettings({ rootMode: value })}
          />
        </Field>

        <Field label="Instrument">
          <OptionButtons
            options={INSTRUMENT_OPTIONS}
            value={instrument}
            onChange={setInstrument}
          />
        </Field>

        {config.hasArpeggio && (
          <Field label="Chord playback">
            <label className="flex cursor-pointer items-center gap-3">
              <Switch
                checked={state.settings.arpeggiated}
                onCheckedChange={(value) =>
                  onSettings({ arpeggiated: value })
                }
              />
              <span className="text-sm">
                {state.settings.arpeggiated
                  ? "Arpeggiated"
                  : "Block chord"}
              </span>
            </label>
          </Field>
        )}

        <p className="text-xs text-muted-foreground">
          Hit 90% accuracy over 20 attempts and the level advances on its own.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

function OptionButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-md border px-3 py-1.5 text-sm transition-colors",
            value === option.value
              ? "border-primary bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
