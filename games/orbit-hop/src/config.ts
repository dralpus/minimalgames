import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'orbit-hop',
  displayName: 'Orbit Hop',
  version: '1.0.0',
  theme: {
    primary: '#7c6cf0',
    secondary: '#40e0d0',
    background: '#0a0e1a',
    accent: '#ff8c42',
    fontFamily: '"Exo 2","Trebuchet MS",sans-serif',
    borderRadius: '10px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:003',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
    interstitial: import.meta.env.VITE_AD_UNIT_INTERSTITIAL ?? '',
  },
  leaderboardCollection: 'orbit-hop-scores',
};

/** Game play constants */
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const FLIGHT_SPEED = 340; // px/s while detached and flying straight
export const LATCH_TOLERANCE = 18; // px tolerance around ring radius to latch on
export const PERFECT_TOLERANCE = 6; // px from ideal ring radius for a "perfect" latch
export const OFFSCREEN_MARGIN = 40; // px beyond screen bounds before death

export const PLANET_RADIUS_MIN = 14;
export const PLANET_RADIUS_MAX = 22;
export const PLANET_COLOR_A = 0x7c6cf0;
export const PLANET_COLOR_B = 0x40e0d0;

export const SPAWN_DIST_MIN = 180;
export const SPAWN_DIST_MAX = 280;
export const MIN_PLANET_SEPARATION = 160;

export const RING_RADIUS_BASE = 70;
export const RING_RADIUS_DECAY = 1.2;
export const RING_RADIUS_MIN = 40;
export const RING_RADIUS_MAX = 70;

export const ORBIT_SPEED_BASE = 90;
export const ORBIT_SPEED_INCREMENT = 4;
export const ORBIT_SPEED_MIN = 90;
export const ORBIT_SPEED_MAX = 220;

export const DRIFT_START_HOP = 15;
export const DRIFT_SPEED_MIN = 8;
export const DRIFT_SPEED_MAX = 14;

export const SCORE_PER_HOP = 10;
export const COINS_PER_PERFECT = 5;
export const XP_PER_HOP = 2;
export const COMBO_MAX_BONUS_MULTIPLIER = 5;
