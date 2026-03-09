import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'tap-blitz',
  displayName: 'Tap Blitz',
  version: '1.0.0',
  theme: {
    primary: '#f72585',
    secondary: '#7209b7',
    background: '#1a1a2e',
    accent: '#4cc9f0',
    fontFamily: '"Nunito", "Arial Rounded MT Bold", sans-serif',
    borderRadius: '16px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:001',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
  },
  leaderboardCollection: 'tap-blitz-scores',
};

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

// Target colors (must match one of these when prompted)
export const TARGET_COLORS: Array<{ name: string; hex: number; css: string }> = [
  { name: 'RED',    hex: 0xe63946, css: '#e63946' },
  { name: 'BLUE',   hex: 0x4361ee, css: '#4361ee' },
  { name: 'GREEN',  hex: 0x2dc653, css: '#2dc653' },
  { name: 'YELLOW', hex: 0xffd60a, css: '#ffd60a' },
  { name: 'PINK',   hex: 0xf72585, css: '#f72585' },
  { name: 'CYAN',   hex: 0x4cc9f0, css: '#4cc9f0' },
];

export const TARGET_RADIUS_MIN = 30;
export const TARGET_RADIUS_MAX = 55;
export const TARGET_LIFETIME = 1800;   // ms before a target disappears
export const TARGETS_ON_SCREEN = 5;
export const ROUND_DURATION = 30;      // seconds per round
export const STREAK_MULTIPLIERS = [1, 1.5, 2, 3];
export const XP_PER_TAP = 3;
