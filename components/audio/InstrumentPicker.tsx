"use client";

// Dropdown for choosing the active playback instrument. Selecting an
// instrument writes to the audio store and starts preloading its samples.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { loadInstrument } from "@/lib/audio/sampler";
import { type InstrumentName, useAudioStore } from "@/lib/store/audio-store";

const OPTIONS: { value: InstrumentName; label: string }[] = [
  { value: "piano", label: "Piano" },
  { value: "guitar", label: "Guitar" },
  { value: "synth", label: "Synth" },
];

export function InstrumentPicker() {
  const instrument = useAudioStore((state) => state.instrument);
  const setInstrument = useAudioStore((state) => state.setInstrument);

  const handleChange = (value: string) => {
    const name = value as InstrumentName;
    setInstrument(name);
    void loadInstrument(name).catch(() => undefined);
  };

  return (
    <Select value={instrument} onValueChange={handleChange}>
      <SelectTrigger className="w-44">
        <SelectValue placeholder="Instrument" />
      </SelectTrigger>
      <SelectContent>
        {OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
