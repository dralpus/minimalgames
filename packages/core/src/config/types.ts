export interface ThemeTokens {
  primary: string;
  secondary: string;
  background: string;
  accent: string;
  fontFamily: string;
  borderRadius: string;
}

export interface AdUnitIds {
  banner?: string;
  interstitial?: string;
  rewarded?: string;
}

export interface FirebaseOptions {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface GameConfig {
  gameId: string;
  displayName: string;
  version: string;
  theme: ThemeTokens;
  firebase: FirebaseOptions;
  adsEnabled: boolean;
  adClientId?: string;
  adUnitIds: AdUnitIds;
  leaderboardCollection: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export type Unsubscribe = () => void;

export interface XPResult {
  previousXP: number;
  newXP: number;
  previousLevel: number;
  newLevel: number;
  leveledUp: boolean;
  xpAdded: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: number | null;
}

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  score: number;
  rank: number;
  createdAt: number;
}

export interface RewardResult {
  granted: boolean;
  rewardType?: string;
  rewardAmount?: number;
}
