"use client";

// Editable profile settings + sign out.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/lib/db/actions";

const INSTRUMENTS = ["piano", "guitar", "bass", "voice", "ukulele", "other"];
const LEVELS = ["beginner", "intermediate", "advanced"];

export function ProfileSettings({
  initial,
}: {
  initial: {
    instrument: string;
    skillLevel: string;
    dailyGoal: number;
  };
}) {
  const router = useRouter();
  const [instrument, setInstrument] = useState(initial.instrument);
  const [skillLevel, setSkillLevel] = useState(initial.skillLevel);
  const [dailyGoal, setDailyGoal] = useState(initial.dailyGoal);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  const save = async () => {
    setStatus("saving");
    await updateProfile({
      instrument,
      skillLevel,
      dailyGoalMinutes: dailyGoal,
    });
    setStatus("saved");
    router.refresh();
  };

  const selectClass =
    "w-full rounded-md border bg-background px-3 py-2 text-sm capitalize";

  return (
    <div className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
        Settings
      </h2>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="instrument">Primary instrument</Label>
          <select
            id="instrument"
            value={instrument}
            onChange={(event) => {
              setInstrument(event.target.value);
              setStatus("idle");
            }}
            className={selectClass}
          >
            <option value="">Not set</option>
            {INSTRUMENTS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="skill">Skill level</Label>
          <select
            id="skill"
            value={skillLevel}
            onChange={(event) => {
              setSkillLevel(event.target.value);
              setStatus("idle");
            }}
            className={selectClass}
          >
            <option value="">Not set</option>
            {LEVELS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal">Daily goal (minutes)</Label>
          <Input
            id="goal"
            type="number"
            min={1}
            max={240}
            value={dailyGoal}
            onChange={(event) => {
              setDailyGoal(Number(event.target.value));
              setStatus("idle");
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button onClick={save} disabled={status === "saving"}>
          {status === "saving"
            ? "Saving…"
            : status === "saved"
              ? "Saved"
              : "Save changes"}
        </Button>
        <Button
          variant="outline"
          onClick={() => void signOut({ redirectTo: "/" })}
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );
}
