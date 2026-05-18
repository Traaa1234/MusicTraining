// Procedural backing-track engine — drums, bass, and chord comp generated
// entirely with Tone.js (no audio files), scheduled on the shared Transport.
import * as Tone from "tone";
import type { Chord } from "@/types/music";
import { getPlayableInstrument } from "@/lib/audio/sampler";
import { getAudioContext } from "@/lib/audio/tone-context";
import { frequencyFromMidi, midiFromNote } from "@/lib/music/notes";

export type TrackName = "drums" | "bass" | "chords";

/** One bar of the progression. */
export interface BackingBar {
  chord: Chord;
}

export interface PlayOptions {
  bars: BackingBar[];
  tempo: number;
  loops: number;
  onBar: (barIndex: number) => void;
  onStop: () => void;
}

const EIGHTHS_PER_BAR = 8;

/** Ascending MIDI numbers for a chord voicing, from the root at octave 4. */
function chordMidis(chord: Chord): number[] {
  const midis: number[] = [];
  let previous = -Infinity;
  for (const name of chord.notes) {
    let midi = midiFromNote(name, 4);
    while (midi <= previous) midi += 12;
    midis.push(midi);
    previous = midi;
  }
  return midis;
}

export class BackingTrackEngine {
  private kick?: Tone.MembraneSynth;
  private snare?: Tone.NoiseSynth;
  private hat?: Tone.NoiseSynth;
  private bass?: Tone.Synth;

  private eventId: number | null = null;
  private playing = false;
  private muted: Record<TrackName, boolean> = {
    drums: false,
    bass: false,
    chords: false,
  };

  private ensureSynths() {
    if (this.kick) return;
    this.kick = new Tone.MembraneSynth({ volume: -8 }).toDestination();
    this.snare = new Tone.NoiseSynth({
      volume: -16,
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 },
    }).toDestination();
    this.hat = new Tone.NoiseSynth({
      volume: -28,
      envelope: { attack: 0.001, decay: 0.035, sustain: 0 },
    }).toDestination();
    this.bass = new Tone.Synth({
      volume: -9,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.02, decay: 0.2, sustain: 0.4, release: 0.3 },
    }).toDestination();
  }

  setMuted(track: TrackName, muted: boolean): void {
    this.muted[track] = muted;
  }

  setTempo(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  async play(options: PlayOptions): Promise<void> {
    await getAudioContext();
    this.ensureSynths();
    this.stop();
    this.playing = true;

    const transport = Tone.getTransport();
    transport.bpm.value = options.tempo;
    const piano = getPlayableInstrument("piano");
    const totalEighths = options.bars.length * EIGHTHS_PER_BAR;
    let tick = 0;

    this.eventId = transport.scheduleRepeat((time) => {
      if (!this.playing) return;

      if (tick >= totalEighths * options.loops) {
        Tone.getDraw().schedule(() => options.onStop(), time);
        this.stop();
        return;
      }

      const local = tick % totalEighths;
      const barIndex = Math.floor(local / EIGHTHS_PER_BAR);
      const eighth = local % EIGHTHS_PER_BAR; // 0..7
      const chord = options.bars[barIndex].chord;

      // Drums — kick on 1 & 3, snare on 2 & 4, hat on every eighth.
      if (!this.muted.drums) {
        this.hat?.triggerAttackRelease("16n", time);
        if (eighth === 0 || eighth === 4) {
          this.kick?.triggerAttackRelease("C1", "8n", time);
        }
        if (eighth === 2 || eighth === 6) {
          this.snare?.triggerAttackRelease("8n", time);
        }
      }

      // Bass — walks root / fifth on each beat.
      if (!this.muted.bass && eighth % 2 === 0) {
        const rootMidi = midiFromNote(chord.root, 2);
        const beat = eighth / 2; // 0..3
        const midi = beat % 2 === 0 ? rootMidi : rootMidi + 7;
        this.bass?.triggerAttackRelease(frequencyFromMidi(midi), "8n", time);
      }

      // Chord comp — piano on beats 1 & 3.
      if (!this.muted.chords && (eighth === 0 || eighth === 4)) {
        piano.triggerAttackRelease(
          chordMidis(chord).map(frequencyFromMidi),
          "2n",
          time,
          0.5,
        );
      }

      // Visual sync — fire on the downbeat of each bar.
      if (eighth === 0) {
        Tone.getDraw().schedule(() => options.onBar(barIndex), time);
      }

      tick += 1;
    }, "8n");

    transport.start();
  }

  stop(): void {
    this.playing = false;
    const transport = Tone.getTransport();
    if (this.eventId !== null) {
      transport.clear(this.eventId);
      this.eventId = null;
    }
    transport.stop();
    transport.position = 0;
    this.bass?.triggerRelease();
    getPlayableInstrument("piano").releaseAll();
  }

  dispose(): void {
    this.stop();
    this.kick?.dispose();
    this.snare?.dispose();
    this.hat?.dispose();
    this.bass?.dispose();
  }
}
