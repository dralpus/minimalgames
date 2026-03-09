import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'gravity-flip',
  displayName: 'Gravity Flip',
  version: '1.0.0',
  theme: {
    primary: '#ff9f1c',
    secondary: '#2ec4b6',
    background: '#0d0d1a',
    accent: '#e71d36',
    fontFamily: '"Exo 2", "Trebuchet MS", sans-serif',
    borderRadius: '10px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:002',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
  },
  leaderboardCollection: 'gravity-flip-scores',
};

export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

// Physics
export const GRAVITY = 1400;       // px/s² (applied in direction)
export const RUN_SPEED = 240;       // px/s (world scrolls at this speed)
export const RUN_SPEED_INCREMENT = 15;  // per 100 distance
export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 28;
export const PLAYER_X = 80;        // fixed horizontal position
export const FLIP_COOLDOWN = 200;  // ms between flips
export const GEM_SCORE = 50;
export const DISTANCE_SCORE_RATE = 1; // points per frame unit scrolled

// Obstacle dimensions
export const OBSTACLE_WIDTH = 32;
export const OBSTACLE_GAP = 160;    // vertical gap between top/bottom obstacles
export const OBSTACLE_INTERVAL = 800; // ms between obstacle spawns

// Parallax layers
export const PARALLAX_SPEEDS = [0.1, 0.25, 0.45]; // relative to run speed
