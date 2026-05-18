# Ear Train

A web-first music theory and ear-training app. The web build is the primary
target; it will later be wrapped for mobile with [Capacitor](https://capacitorjs.com/).

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

### Environment

Copy `.env.local.example` to `.env.local` and fill in Supabase values. The
skeleton runs without them — they are only needed once auth and data sync land.

## Tech stack

| Concern         | Choice                                            |
| --------------- | ------------------------------------------------- |
| Framework       | Next.js (App Router) + TypeScript (strict mode)   |
| Styling         | Tailwind CSS v4 + shadcn/ui (new-york, slate)     |
| Client state    | Zustand                                           |
| Audio           | Tone.js (synthesis + scheduling)                  |
| Music theory    | @tonaljs/tonal                                    |
| Backend         | Supabase (installed, not yet connected)           |
| Icons           | lucide-react                                      |

> Note: `create-next-app` installed the latest stable Next.js (16.x). The spec
> named Next 15; the App Router API used here is unchanged between the two.

## Folder conventions

```
app/                 Routes (App Router)
  (marketing)/       Landing page (route group — no URL segment)
  learn/             Theory lessons hub
  train/             Ear training hub
  tools/             Fretboard, circle of fifths, scale visualizer
  practice/          Play-along / backing tracks
  profile/           Progress + settings
  layout.tsx         Global shell (AudioProvider + AppShell)

components/
  ui/                shadcn/ui components
  audio/             Audio components (AudioProvider, Player, NoteButton, ...)
  music/             Music-domain components (Fretboard, CircleOfFifths, Staff, ...)
  layout/            Navigation + shell

lib/
  music/             PURE music theory utilities — no audio, no UI
  audio/             Tone.js context + samplers + pitch detection
  supabase/          Browser + server Supabase clients
  store/             Zustand stores
  utils.ts           cn() class-name helper

types/
  music.ts           Note, Interval, Scale, Chord, Key types
```

### Rules of thumb

- `lib/music/*` is pure: it imports only from `types/` and never touches audio
  or the DOM. Keep it that way so theory logic stays testable.
- Audio cannot start until a user gesture. `AudioProvider` resumes the Tone.js
  context on the first interaction; read readiness with `useAudio()`.
- Path alias `@/*` maps to the project root (e.g. `@/lib/utils`).
