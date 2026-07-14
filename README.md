# MinimalGames Platform

A mobile-web multi-game platform. Each game is independently deployed and branded, but shares a common core module for auth, ads, monetization, gamification, and more.

## Architecture

```
minimalgames/
├── packages/
│   └── core/          # @minimalgames/core — shared systems
├── games/
│   ├── neon-dodge/    # Minimalist dodge game
│   ├── tap-blitz/     # Reaction tapping game
│   ├── gravity-flip/  # Gravity-flipping endless runner
│   ├── orbit-hop/     # Orbital timing hops through space
│   ├── pin-storm/     # Knife-hit style pin throwing, 20+ levels
│   └── hue-jump/      # Color-switch vertical climber
└── .github/workflows/ # CI/CD pipelines
```

## Tech Stack

- **Build**: Vite + Turborepo + pnpm workspaces
- **Language**: TypeScript
- **Game Engine**: Phaser 3
- **Auth/DB**: Firebase (Auth + Firestore)
- **Ads**: Google AdSense (web) / AdMob (native via Capacitor)
- **Deploy**: Cloudflare Pages (per-branch previews)
- **Testing**: Vitest + Playwright

## Getting Started

```bash
# Install pnpm if needed
npm install -g pnpm@9

# Install all dependencies
pnpm install

# Run all games in dev mode
pnpm dev

# Run a specific game
cd games/neon-dodge && pnpm dev

# Build everything
pnpm build

# Run tests
pnpm test
```

## Adding a New Game

1. Copy `games/neon-dodge` as a template: `cp -r games/neon-dodge games/my-new-game`
2. Update `games/my-new-game/package.json` — set the `name` field
3. Update `games/my-new-game/src/config.ts` — set your game's theme + Firebase config
4. Implement your Phaser scenes in `games/my-new-game/src/scenes/`
5. Add a Cloudflare Pages project for the new game (see CI/CD docs)

## Core Module

Import from `@minimalgames/core`:

```typescript
import {
  AuthManager,
  AdManager,
  XPManager,
  AchievementManager,
  LeaderboardManager,
  CurrencyManager,
  StorageManager,
  AudioManager,
  InputManager,
  Modal,
  Toast,
} from '@minimalgames/core';
```

## Environment Variables

Each game needs a `.env.local` file (copy from `.env.example`):

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_AD_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
```

## CI/CD

- **Every push** → lint + test + build
- **Every branch** → preview deploy per game at `<game>-<branch>.pages.dev`
- **Merge to main** → production deploy

See `.github/workflows/` for pipeline definitions.
