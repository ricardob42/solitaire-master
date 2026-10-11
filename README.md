# Solitaire Master

Klondike Solitaire as an installable, offline-capable PWA. Svelte 5 · Vite · TypeScript.

Features: daily challenge with streaks, hints that explain themselves, unlimited undo/redo, a move timeline you can scrub, statistics, five felts, five card backs, six languages (EN, ES, PT, FR, DE, IT), shareable games, keyboard play, synthesised sound.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ locally (the service worker only runs in a build)
npm run check      # svelte-check + TypeScript
```

Requires Node 20.19+ (Vite 7).

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel: **Add New → Project**, import the repository.
3. Leave the defaults. The framework is detected as **Vite** (`npm run build`, output `dist`). `vercel.json` only adds cache headers: hashed assets are immutable, the service worker and manifest are always revalidated.

CLI alternative: `npx vercel --prod`.

Updates reach players through a prompt ("A new version is ready") rather than a silent reload, so a game in progress is never interrupted.

## Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Move cards | Drag; invalid drops slide back | Arrow keys move focus, Enter plays the focused card |
| Send a card to its best pile | Double-click / double-tap | Enter |
| Draw / recycle | Click or tap the stock | Space on the stock |
| Hint | Lightbulb button | `H` |
| Undo / redo | Header buttons | `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z` or `Ctrl+Y` |

## Scoring

| Event | Points |
| --- | --- |
| Card to a tableau column | +5 |
| Card to a foundation | +10 |
| Face-down card revealed | +5 |
| Waste recycled | −5 |
| Undo | −1 (stepping forward again refunds it) |

The hint ranks moves: foundation, then reveal, then waste, then tableau building. Late in a game it favours racing cards home.

## How it works

The game is stored as an **initial deck order plus a list of actions**, never as snapshots. The board is a pure function of those two things.

- Undo, redo and the timeline slider only move a cursor and replay actions. Undo is unlimited and survives reloads.
- A share link is the deck plus the applied actions, in about 100 characters per few dozen moves. Links are validated by replaying them.
- Every card stays mounted for the whole game. A move changes only a card's `--x` / `--y`, and CSS transitions do the animating. Deals, flips, hints, landings and score pops are CSS keyframes. `prefers-reduced-motion` disables all of them with one media query.

```
src/
  lib/
    engine/       pure game logic: rules, moves, hints, dealing, share codec
    state/        Svelte 5 rune stores: game, settings, stats, ui
    components/   Board, Card, Header, dialogs, hint, toast, cascade
    i18n/         typed dictionaries (en is the source; other languages must match its keys)
    layout.ts     card metrics, positions, drop-target hit testing
    audio.ts      Web Audio sound effects, no audio files
    pwa.ts        service worker registration and install prompt
  styles/         fonts, OKLCH theme tokens, card backs, dialog primitives
```

### Customising

- **New felt:** add one line to `src/styles/theme.css` (`[data-theme='name'] { --hue: …; --chroma: … }`), then add the name to `THEMES` / `THEME_COLOR` in `settings.svelte.ts` and a `theme.name` string to each dictionary.
- **New language:** add `src/lib/i18n/xx.ts` typed as `Record<keyof typeof en, string>`; the compiler lists every missing key.
- **Card backs:** patterns live in `src/styles/backs.css`.

## Data and compatibility

Settings and statistics use the same `localStorage` keys as the previous single-file version, so records, streaks and preferences carry over when deployed on the same origin. A game in progress is stored in a new format (`solitaire_game_v2`) and is not migrated: the first launch deals a new game.

## Stack notes

- Fonts are self-hosted from `@fontsource-variable` (Fraunces, Instrument Sans, JetBrains Mono, Latin subset) and precached for offline use.
- `vite-plugin-pwa` generates the service worker and manifest (installable, maskable icon, `New game` and `Daily challenge` shortcuts, Web Share Target).
- The screen is kept awake during play through the Wake Lock API (toggle in Settings).
