import type { GameConfig } from '@core';

export const GAME_CONFIG: GameConfig = {
  gameId: 'pin-storm',
  displayName: 'Pin Storm',
  version: '1.0.0',
  theme: {
    primary: '#ff6b35',
    secondary: '#00b4ff',
    background: '#12141c',
    accent: '#ffd700',
    fontFamily: '"Rajdhani", "Arial Narrow", sans-serif',
    borderRadius: '8px',
  },
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? 'demo-key',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? 'demo.firebaseapp.com',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? 'demo-project',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? 'demo.appspot.com',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '1:000:web:004',
  },
  adsEnabled: import.meta.env.VITE_ADS_ENABLED === 'true',
  adClientId: import.meta.env.VITE_AD_CLIENT ?? '',
  adUnitIds: {
    banner: import.meta.env.VITE_AD_UNIT_BANNER ?? '',
    rewarded: import.meta.env.VITE_AD_UNIT_REWARDED ?? '',
    interstitial: import.meta.env.VITE_AD_UNIT_INTERSTITIAL ?? '',
  },
  leaderboardCollection: 'pin-storm-scores',
};

/** Game play constants */
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

export const WHEEL_RADIUS = 110;
export const WHEEL_CENTER_X = 200;
export const WHEEL_CENTER_Y = 210;

export const WAITING_PIN_X = 200;
export const WAITING_PIN_Y = 620;

export const PIN_WIDTH = 4;
export const PIN_LENGTH = 42;
export const PIN_HEAD_RADIUS = 6;

export const PIN_SPEED = 1400; // px/s

/** Minimum angular gap (deg) between stuck pins — closer than this is a fail */
export const MIN_PIN_GAP = 11;
/** Angular gap (deg) within which a gold stud is considered hit */
export const GOLD_STUD_HIT_GAP = 8;
/** Minimum angular gap (deg) a newly placed gold stud must keep from preplaced pins */
export const GOLD_STUD_PLACEMENT_GAP = 15;

export type RotationPattern = 'constant' | 'pulse' | 'reverse' | 'stutter';

export interface LevelDef {
  pins: number;
  rpm: number;
  pattern: RotationPattern;
  preplaced: number;
}

/** Levels 1-20 (index 0 = level 1) */
export const LEVELS: LevelDef[] = [
  { pins: 5, rpm: 6, pattern: 'constant', preplaced: 0 },  // L1
  { pins: 6, rpm: 7, pattern: 'constant', preplaced: 0 },  // L2
  { pins: 6, rpm: 8, pattern: 'constant', preplaced: 2 },  // L3
  { pins: 7, rpm: 8, pattern: 'pulse', preplaced: 0 },     // L4
  { pins: 7, rpm: 9, pattern: 'pulse', preplaced: 2 },     // L5
  { pins: 8, rpm: 9, pattern: 'reverse', preplaced: 0 },   // L6
  { pins: 8, rpm: 10, pattern: 'reverse', preplaced: 2 },  // L7
  { pins: 9, rpm: 10, pattern: 'pulse', preplaced: 3 },    // L8
  { pins: 9, rpm: 11, pattern: 'stutter', preplaced: 0 },  // L9
  { pins: 10, rpm: 11, pattern: 'stutter', preplaced: 2 }, // L10
  { pins: 10, rpm: 12, pattern: 'reverse', preplaced: 3 }, // L11
  { pins: 11, rpm: 12, pattern: 'pulse', preplaced: 3 },   // L12
  { pins: 11, rpm: 13, pattern: 'stutter', preplaced: 3 }, // L13
  { pins: 12, rpm: 13, pattern: 'reverse', preplaced: 4 }, // L14
  { pins: 12, rpm: 14, pattern: 'pulse', preplaced: 4 },   // L15
  { pins: 13, rpm: 14, pattern: 'stutter', preplaced: 4 }, // L16
  { pins: 13, rpm: 15, pattern: 'reverse', preplaced: 5 }, // L17
  { pins: 14, rpm: 15, pattern: 'stutter', preplaced: 5 }, // L18
  { pins: 14, rpm: 16, pattern: 'pulse', preplaced: 5 },   // L19
  { pins: 15, rpm: 16, pattern: 'stutter', preplaced: 6 }, // L20
];

const PROCEDURAL_PATTERNS: RotationPattern[] = ['pulse', 'reverse', 'stutter'];

/** Level definition for any level number, including procedurally generated ones beyond 20 */
export function getLevelDef(level: number): LevelDef {
  if (level >= 1 && level <= LEVELS.length) {
    return LEVELS[level - 1];
  }
  const n = Math.max(level, LEVELS.length + 1);
  return {
    pins: 15,
    rpm: Math.min(16 + (n - 20) * 0.5, 24),
    pattern: PROCEDURAL_PATTERNS[(n - LEVELS.length - 1) % PROCEDURAL_PATTERNS.length],
    preplaced: Math.min(6 + Math.floor((n - 20) / 2), 10),
  };
}

/** Number of gold studs to spawn for a given level (0 before level 3) */
export function getGoldStudCount(level: number): number {
  if (level < 3) return 0;
  return 1 + (level >= 8 ? 1 : 0);
}

export const SCORE_PER_STUCK_PIN = 1;
export const SCORE_PER_LEVEL_CLEAR = 25;
export const XP_PER_STUCK_PIN = 3;
export const XP_PER_LEVEL_CLEAR = 10;
export const GOLD_PER_STUD = 5;
