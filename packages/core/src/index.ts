// Main orchestrator
export { GameEngine } from './GameEngine';

// Auth
export { AuthManager } from './auth/AuthManager';
export type { IAuthManager } from './auth/AuthManager';

// Storage
export { StorageManager } from './storage/StorageManager';

// Ads
export { AdManager } from './ads/AdManager';
export type { IAdManager, AdPosition } from './ads/AdManager';

// Monetization
export { CurrencyManager } from './monetization/CurrencyManager';
export type { CurrencyChangeCallback } from './monetization/CurrencyManager';

// Gamification
export { XPManager } from './gamification/XPManager';
export { AchievementManager } from './gamification/AchievementManager';
export type { AchievementDef, AchievementUnlockCallback } from './gamification/AchievementManager';
export { LeaderboardManager } from './gamification/LeaderboardManager';

// Analytics
export { AnalyticsManager } from './analytics/AnalyticsManager';

// Audio
export { AudioManager } from './audio/AudioManager';

// Input
export { InputManager } from './input/InputManager';
export type { TouchPoint, SwipeEvent } from './input/InputManager';

// UI
export { Modal } from './ui/Modal';
export type { ModalOptions } from './ui/Modal';
export { Toast } from './ui/Toast';
export type { ToastType } from './ui/Toast';
export { HUD } from './ui/HUD';
export type { HUDConfig, HUDItem } from './ui/HUD';

// Types
export type {
  GameConfig,
  ThemeTokens,
  FirebaseOptions,
  AdUnitIds,
  User,
  Unsubscribe,
  XPResult,
  Achievement,
  LeaderboardEntry,
  RewardResult,
} from './config/types';
