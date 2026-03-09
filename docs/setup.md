# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+: `npm install -g pnpm@9`
- Firebase project (free tier)
- Cloudflare account (for deployment)

## 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (e.g. `minimalgames-prod`)
3. Enable **Authentication** → Email/Password and Google
4. Enable **Firestore Database** → Start in test mode
5. Enable **Analytics** (optional but recommended)
6. Copy your Firebase config from Project Settings → Web App

### Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leaderboard: anyone can read, only authenticated users can write their own
    match /{game}-scores/{docId} {
      allow read: if true;
      allow write: if request.auth != null && request.resource.data.uid == request.auth.uid;
    }
    // Player data: only the owning user
    match /playerData/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

## 2. Local Development

```bash
# Clone the repo
git clone https://github.com/your-org/minimalgames.git
cd minimalgames

# Install dependencies
pnpm install

# Copy env files for each game
cp games/neon-dodge/.env.example games/neon-dodge/.env.local
cp games/tap-blitz/.env.example games/tap-blitz/.env.local
cp games/gravity-flip/.env.example games/gravity-flip/.env.local

# Fill in your Firebase config in each .env.local
# Edit games/neon-dodge/.env.local etc.

# Run all games in dev mode
pnpm dev

# Or run a specific game
cd games/neon-dodge && pnpm dev    # → http://localhost:3001
cd games/tap-blitz && pnpm dev     # → http://localhost:3002
cd games/gravity-flip && pnpm dev  # → http://localhost:3003
```

## 3. Cloudflare Pages Setup

For each game, create a Cloudflare Pages project:

1. Go to Cloudflare Dashboard → Pages → Create a project
2. Connect your GitHub repository
3. Set the project name: `mg-neon-dodge`, `mg-tap-blitz`, `mg-gravity-flip`
4. Build settings:
   - Build command: `pnpm turbo run build --filter=@minimalgames/neon-dodge`
   - Build output directory: `games/neon-dodge/dist`
   - Root directory: `/`
5. Add environment variables (same as secrets below)

Alternatively, use the **GitHub Actions deploy** (already configured) and just create the Cloudflare Pages projects manually once.

## 4. GitHub Secrets

Add these secrets to your GitHub repository (Settings → Secrets → Actions):

| Secret | Description |
|--------|-------------|
| `FIREBASE_API_KEY` | Firebase web API key |
| `FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | Sender ID from Firebase |
| `FIREBASE_APP_ID` | Web app ID from Firebase |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token with Pages permissions |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID |
| `AD_CLIENT` | Google AdSense publisher ID (production) |
| `AD_UNIT_BANNER` | AdSense/AdMob banner ad unit |
| `AD_UNIT_REWARDED` | AdMob rewarded ad unit |
| `AD_UNIT_INTERSTITIAL` | AdMob interstitial ad unit |

## 5. Adding a New Game

```bash
# Copy the neon-dodge template
cp -r games/neon-dodge games/my-new-game

# Update package name
# Edit games/my-new-game/package.json → "name": "@minimalgames/my-new-game"

# Update game ID and theme
# Edit games/my-new-game/src/config.ts → gameId, displayName, theme, firebase.appId

# Update Vite port
# Edit games/my-new-game/vite.config.ts → server.port: 3004

# Implement your Phaser scenes
# Edit games/my-new-game/src/scenes/GameScene.ts

# Add env file
cp games/my-new-game/.env.example games/my-new-game/.env.local
```

Then add `my-new-game` to the matrix in `.github/workflows/deploy-preview.yml` and `deploy-production.yml`.

Create a Cloudflare Pages project named `mg-my-new-game`.

## 6. Mobile Testing

Test on real mobile devices by:
1. Run `pnpm dev` on your machine
2. Find your local IP: `ipconfig` / `ifconfig`
3. Open `http://YOUR_IP:3001` on your phone (same WiFi)

Or use browser DevTools → device emulation with touch simulation.

## 7. Capacitor Wrapping (Future)

To wrap a game as a native iOS/Android app:

```bash
cd games/neon-dodge
pnpm build

# Add Capacitor
npx cap init "Neon Dodge" com.minimalgames.neondodge
npx cap add ios
npx cap add android
npx cap copy

# Open native IDE
npx cap open ios
npx cap open android
```

Replace the web AdSense ads with `@capacitor-community/admob` for native ad revenue.
