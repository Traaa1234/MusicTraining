"use client";

// Embeddable lesson quiz. Supports four question types:
// multiple-choice, true-false, play-and-identify, drag-to-order.
//
// Usage in MDX:
//   <Quiz>
//     <Question type="multiple-choice" answer={2}>
//       Prompt text
//       <Option>A</Option><Option>B</Option><Option>C</Option>
//     </Question>
//   </Quiz>
//
// Because lesson MDX is server-rendered and these are client components,
// Quiz/Question/Option cannot reliably introspect each other by element type.
// Instead, Questions register with the Quiz and Options register with their
// Question through React context, which works across the boundary.
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { ArrowDown, ArrowUp, Check, Play, X } from "lucide-react";
import { playNotes } from "@/lib/audio/playback";
import { midiFromPitch, noteFromMidi } from "@/lib/music/notes";
import { PASS_THRESHOLD, useLearnStore } from "@/lib/store/learn-store";
import { useLessonId } from "@/components/learn/lesson-context";
import { cn } from "@/lib/utils";

type QuestionType =
  | "multiple-choice"
  | "true-false"
  | "play-and-identify"
  | "drag-to-order";

type RegisteredOption = { key: string; value?: string; label: ReactNode };

interface QuizApi {
  registerQuestion: (id: string) => void;
  unregisterQuestion: (id: string) => void;
  reportResult: (id: string, correct: boolean) => void;
}
interface QuestionApi {
  addOption: (option: RegisteredOption) => void;
  removeOption: (key: string) => void;
}

const QuizContext = createContext<QuizApi | null>(null);
const QuestionContext = createContext<QuestionApi | null>(null);

// --- Quiz -------------------------------------------------------------------

export function Quiz({ children }: { children: ReactNode }) {
  const lessonId = useLessonId();
  const recordQuiz = useLearnStore((store) => store.recordQuiz);

  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [attempt, setAttempt] = useState(0);

  const api = useMemo<QuizApi>(
    () => ({
      registerQuestion: (id) =>
        setQuestionIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
      unregisterQuestion: (id) =>
        setQuestionIds((prev) => prev.filter((value) => value !== id)),
      reportResult: (id, correct) =>
        setResults((prev) => ({ ...prev, [id]: correct })),
    }),
    [],
  );

  const total = questionIds.length;
  const answered = Object.keys(results).length;
  const correctCount = Object.values(results).filter(Boolean).length;
  const done = total > 0 && answered >= total;
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  const passed = score >= PASS_THRESHOLD;

  useEffect(() => {
    if (done && lessonId) recordQuiz(lessonId, score);
  }, [done, lessonId, score, recordQuiz]);

  const retake = () => {
    setResults({});
    setAttempt((value) => value + 1);
  };

  return (
    <QuizContext.Provider value={api}>
      <section className="my-8 space-y-4 rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Check yourself
          </h3>
          <span className="text-xs text-muted-foreground tabular-nums">
            {answered} / {total || "…"}
          </span>
        </div>

        <div key={attempt} className="space-y-3">
          {children}
        </div>

        {done && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4",
              passed
                ? "border-emerald-600/40 bg-emerald-600/10"
                : "border-red-600/40 bg-red-600/10",
            )}
          >
            <p className="text-sm">
              <span className="font-semibold">{score}%</span>{" "}
              {passed ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  — passed, this lesson counts as complete.
                </span>
              ) : (
                <span className="text-red-600 dark:text-red-400">
                  — you need {PASS_THRESHOLD}% to complete the lesson.
                </span>
              )}
            </p>
            {!passed && (
              <button
                type="button"
                onClick={retake}
                className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
              >
                Retake
              </button>
            )}
          </div>
        )}
      </section>
    </QuizContext.Provider>
  );
}

// --- Option -----------------------------------------------------------------

export function Option({
  value,
  children,
}: {
  value?: string;
  children: ReactNode;
}) {
  const question = useContext(QuestionContext);
  const key = useId();

  useEffect(() => {
    question?.addOption({ key, value, label: children });
    return () => question?.removeOption(key);
    // children is static MDX content; intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, key, value]);

  return null;
}

// --- Question ---------------------------------------------------------------

export function Question({
  type,
  answer,
  play,
  children,
}: {
  type: QuestionType;
  answer?: number | string | boolean;
  play?: string;
  children: ReactNode;
}) {
  const id = useId();
  const quiz = useContext(QuizContext);
  const [options, setOptions] = useState<RegisteredOption[]>([]);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    quiz?.registerQuestion(id);
    return () => quiz?.unregisterQuestion(id);
  }, [quiz, id]);

  const api = useMemo<QuestionApi>(
    () => ({
      addOption: (option) =>
        setOptions((prev) =>
          prev.some((existing) => existing.key === option.key)
            ? prev
            : [...prev, option],
        ),
      removeOption: (key) =>
        setOptions((prev) => prev.filter((option) => option.key !== key)),
    }),
    [],
  );

  const submit = (isCorrect: boolean) => {
    if (resolved) return;
    setResolved(true);
    quiz?.reportResult(id, isCorrect);
  };

  return (
    <QuestionContext.Provider value={api}>
      <div className="space-y-3 rounded-lg border bg-background p-4">
        <div className="text-sm font-medium [&_p]:my-0">{children}</div>

        {type === "true-false" ? (
          <TrueFalse answer={answer === true} onSubmit={submit} />
        ) : type === "drag-to-order" ? (
          <OrderQuestion options={options} onSubmit={submit} />
        ) : (
          <ChoiceList
            options={options}
            answer={answer}
            play={type === "play-and-identify" ? play : undefined}
            onSubmit={submit}
          />
        )}
      </div>
    </QuestionContext.Provider>
  );
}

// --- shared helpers ---------------------------------------------------------

async function playPitches(spec: string, chord: boolean): Promise<void> {
  const notes = spec
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((token) => noteFromMidi(midiFromPitch(token)));
  await playNotes(notes, { gap: chord ? 0 : 0.45, duration: chord ? 1.5 : 0.6 });
}

function PlayClip({ spec }: { spec: string }) {
  return (
    <button
      type="button"
      onClick={() => void playPitches(spec, true)}
      className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
    >
      <Play className="size-4" fill="currentColor" />
      Play sound
    </button>
  );
}

function resultClass(state: "idle" | "correct" | "wrong" | "muted"): string {
  switch (state) {
    case "correct":
      return "border-emerald-700 bg-emerald-700 text-white";
    case "wrong":
      return "border-red-700 bg-red-700 text-white";
    case "muted":
      return "opacity-55";
    default:
      return "bg-background hover:bg-accent";
  }
}

// --- multiple-choice / play-and-identify ------------------------------------

function ChoiceList({
  options,
  answer,
  play,
  onSubmit,
}: {
  options: RegisteredOption[];
  answer: number | string | boolean | undefined;
  play?: string;
  onSubmit: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState<number | null>(null);

  const correctIndex =
    typeof answer === "number"
      ? answer
      : options.findIndex((option) => option.value === answer);

  const pick = (index: number) => {
    if (chosen !== null) return;
    setChosen(index);
    onSubmit(index === correctIndex);
  };

  return (
    <div className="space-y-3">
      {play && <PlayClip spec={play} />}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option, index) => {
          let state: "idle" | "correct" | "wrong" | "muted" = "idle";
          if (chosen !== null) {
            if (index === correctIndex) state = "correct";
            else if (index === chosen) state = "wrong";
            else state = "muted";
          }
          return (
            <button
              key={option.key}
              type="button"
              disabled={chosen !== null}
              onClick={() => pick(index)}
              className={cn(
                "rounded-md border px-3 py-2 text-left text-sm transition-colors disabled:cursor-default",
                resultClass(state),
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// --- true-false -------------------------------------------------------------

function TrueFalse({
  answer,
  onSubmit,
}: {
  answer: boolean;
  onSubmit: (correct: boolean) => void;
}) {
  const [chosen, setChosen] = useState<boolean | null>(null);

  const pick = (value: boolean) => {
    if (chosen !== null) return;
    setChosen(value);
    onSubmit(value === answer);
  };

  return (
    <div className="flex gap-2">
      {[true, false].map((value) => {
        let state: "idle" | "correct" | "wrong" | "muted" = "idle";
        if (chosen !== null) {
          if (value === answer) state = "correct";
          else if (value === chosen) state = "wrong";
          else state = "muted";
        }
        return (
          <button
            key={String(value)}
            type="button"
            disabled={chosen !== null}
            onClick={() => pick(value)}
            className={cn(
              "flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors disabled:cursor-default",
              resultClass(state),
            )}
          >
            {value ? "True" : "False"}
          </button>
        );
      })}
    </div>
  );
}

// --- drag-to-order ----------------------------------------------------------

function shuffle(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  if (length > 1 && arr.every((value, i) => value === i)) {
    return shuffle(length);
  }
  return arr;
}

function OrderQuestion({
  options,
  onSubmit,
}: {
  options: RegisteredOption[];
  onSubmit: (correct: boolean) => void;
}) {
  const [order, setOrder] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  // Shuffle once the options have registered.
  useEffect(() => {
    if (options.length > 0) setOrder(shuffle(options.length));
  }, [options.length]);

  if (options.length === 0 || order.length !== options.length) {
    return null;
  }

  const move = (position: number, direction: -1 | 1) => {
    if (done) return;
    setOrder((prev) => {
      const target = position + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[position], next[target]] = [next[target], next[position]];
      return next;
    });
  };

  const isCorrect = order.every((value, index) => value === index);

  const check = () => {
    if (done) return;
    setDone(true);
    onSubmit(isCorrect);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Use the arrows to put these in the correct order, top to bottom.
      </p>
      <ul className="space-y-1.5">
        {order.map((sourceIndex, position) => (
          <li
            key={options[sourceIndex].key}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
              done && (isCorrect ? "border-emerald-600" : "border-red-600"),
              !done && "bg-background",
            )}
          >
            <span className="flex-1">{options[sourceIndex].label}</span>
            {!done && (
              <span className="flex gap-1">
                <button
                  type="button"
                  aria-label="Move up"
                  onClick={() => move(position, -1)}
                  className="rounded border p-1 hover:bg-accent"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  onClick={() => move(position, 1)}
                  className="rounded border p-1 hover:bg-accent"
                >
                  <ArrowDown className="size-3.5" />
                </button>
              </span>
            )}
          </li>
        ))}
      </ul>
      {done ? (
        <p
          className={cn(
            "flex items-center gap-1.5 text-sm font-medium",
            isCorrect
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400",
          )}
        >
          {isCorrect ? <Check className="size-4" /> : <X className="size-4" />}
          {isCorrect ? "Correct order" : "Not quite"}
        </p>
      ) : (
        <button
          type="button"
          onClick={check}
          className="rounded-md border bg-background px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          Check order
        </button>
      )}
    </div>
  );
}
