import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'neon-dodge',
  displayName: 'Neon Dodge',
  version: '1.0.0',
  theme: {
    primary: '#00f5ff',       // cyan
    secondary: '#ff00ff',     // magenta
    background: '#000011',
    accent: '#ff6b35',
    fontFamily: '"Orbitron", "Courier New", monospace',
    borderRadius: '8px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:000',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
    interstitial: import.meta.env.VITE_AD_UNIT_INTERSTITIAL ?? '',
  },
  leaderboardCollection: 'neon-dodge-scores',
};

/** Game play constants */
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;
export const PLAYER_RADIUS = 16;
export const PLAYER_SPEED = 260;
export const BAR_WIDTH_MIN = 60;
export const BAR_WIDTH_MAX = 180;
export const BAR_HEIGHT = 18;
export const BAR_START_SPEED = 180;
export const BAR_SPEED_INCREMENT = 12;   // per level-up
export const BAR_SPAWN_INTERVAL = 900;   // ms
export const BAR_SPAWN_DECREMENT = 30;   // ms per level-up
export const SCORE_PER_SECOND = 10;
export const XP_PER_SECOND = 2;
