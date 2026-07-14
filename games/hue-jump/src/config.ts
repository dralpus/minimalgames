import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'hue-jump',
  displayName: 'Hue Jump',
  version: '1.0.0',
  theme: {
    primary: '#ff3366',      // rose
    secondary: '#33ddff',    // cyan
    background: '#16121f',
    accent: '#ffcc00',       // gold
    fontFamily: '"Nunito","Arial Rounded MT Bold",sans-serif',
    borderRadius: '14px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:005',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
    interstitial: import.meta.env.VITE_AD_UNIT_INTERSTITIAL ?? '',
  },
  leaderboardCollection: 'hue-jump-scores',
};

/** Game play constants */
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

/** The 4 colors an orb (and obstacle segments) can be: rose, gold, cyan, green */
export const COLORS = [0xff3366, 0xffcc00, 0x33ddff, 0x66ff66];

export const ORB_RADIUS = 12;
export const ORB_X = 200;
export const GRAVITY = 1150;
export const JUMP_VY = -420;
export const TERMINAL_VY = 700;

export const START_Y = 600;
export const OBSTACLE_GAP_Y = 320;

export const RING_RADIUS = 95;
export const RING_THICKNESS = 14;

export const BAR_HEIGHT = 14;
export const BAR_SEGMENT_WIDTH = 100;
export const BAR_WRAP = BAR_SEGMENT_WIDTH * 4; // 400 — one full 4-color cycle

export const CROSS_ARM_LENGTH = 220;
export const CROSS_THICKNESS = 14;

export const PICKUP_SIZE = 16;
export const PICKUP_OFFSET_Y = 140;
export const PICKUP_RADIUS = 22;

export const STAR_RADIUS = 10;
export const STAR_OFFSET_Y = 60;

export const HEIGHT_PER_METER = 40;
