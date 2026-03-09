import type { GameConfig, User } from './config/types';
import { AuthManager } from './auth/AuthManager';
import { StorageManager } from './storage/StorageManager';
import { AdManager } from './ads/AdManager';
import { CurrencyManager } from './monetization/CurrencyManager';
import { XPManager } from './gamification/XPManager';
import { AchievementManager } from './gamification/AchievementManager';
import { LeaderboardManager } from './gamification/LeaderboardManager';
import { AnalyticsManager } from './analytics/AnalyticsManager';
import { AudioManager } from './audio/AudioManager';
import { Toast } from './ui/Toast';
import { Modal } from './ui/Modal';

/**
 * GameEngine: top-level orchestrator that wires all core systems together.
 * Each game creates one instance, passing its GameConfig.
 *
 * Usage:
 *   const engine = new GameEngine(config);
 *   await engine.init();
 *   engine.auth.loginAnonymously();
 */
export class GameEngine {
  readonly config: GameConfig;
  readonly auth: AuthManager;
  readonly storage: StorageManager;
  readonly ads: AdManager;
  readonly currency: CurrencyManager;
  readonly xp: XPManager;
  readonly achievements: AchievementManager;
  readonly leaderboard: LeaderboardManager;
  readonly analytics: AnalyticsManager;
  readonly audio: AudioManager;
  readonly toast: Toast;
  readonly modal: Modal;

  private firebaseApp: any = null;

  constructor(config: GameConfig) {
    this.config = config;
    this.storage = new StorageManager(config.gameId);
    this.auth = new AuthManager();
    this.ads = new AdManager();
    this.currency = new CurrencyManager(this.storage, 'coins');
    this.xp = new XPManager(this.storage);
    this.achievements = new AchievementManager(this.storage);
    this.leaderboard = new LeaderboardManager(config.leaderboardCollection);
    this.analytics = new AnalyticsManager(config.gameId);
    this.audio = new AudioManager();
    this.toast = new Toast(config.theme);
    this.modal = new Modal();
  }

  async init(): Promise<void> {
    // Initialize Firebase
    const { initializeApp, getApps } = await import('firebase/app');
    const appId = this.config.firebase.appId;
    const existingApp = getApps().find((a) => a.options.appId === appId);
    this.firebaseApp =
      existingApp ?? initializeApp(this.config.firebase, this.config.gameId);

    // Initialize systems that need Firebase
    await this.auth.init(this.config.firebase);
    await this.leaderboard.init(this.firebaseApp, null);
    await this.analytics.init(this.firebaseApp);
    await this.audio.init();

    // Wire auth changes to cloud sync + leaderboard
    this.auth.onAuthChange(async (user: User | null) => {
      this.leaderboard.setUser(user);
      if (user) {
        await this.storage.enableCloudSync(this.firebaseApp, user.uid);
        await this.storage.loadFromCloud();
        this.toast.success(`Welcome back, ${user.displayName ?? 'Player'}!`, 2500);
      } else {
        this.storage.disableCloudSync();
      }
    });

    // Initialize ads
    if (this.config.adsEnabled && this.config.adClientId) {
      this.ads.init(this.config.adClientId, this.config.adUnitIds);
    }

    // Achievement unlock → toast notification
    this.achievements.onUnlock((achievement) => {
      this.toast.success(`Achievement unlocked: ${achievement.name}!`, 4000);
      this.analytics.trackAchievement(achievement.id);
    });

    // XP level-up feedback is handled per-game via the xp manager result
  }

  /** Shortcut: show rewarded ad, then call callback if reward was granted */
  async showRewardedAd(onRewarded: () => void): Promise<void> {
    this.analytics.trackAdImpression('rewarded');
    const result = await this.ads.showRewarded();
    if (result.granted) {
      onRewarded();
    } else {
      this.toast.info('Watch the full ad to earn your reward.');
    }
  }

  /** Shortcut: show interstitial ad between game rounds */
  async showInterstitialAd(): Promise<void> {
    this.analytics.trackAdImpression('interstitial');
    await this.ads.showInterstitial();
  }
}
