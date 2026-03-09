export interface EventProperties {
  [key: string]: string | number | boolean | null;
}

export class AnalyticsManager {
  private gameId: string;
  private firebaseAnalytics: any = null;
  private sessionStart = Date.now();
  private eventQueue: Array<{ name: string; props: EventProperties }> = [];

  constructor(gameId: string) {
    this.gameId = gameId;
  }

  async init(firebaseApp: any): Promise<void> {
    try {
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      if (await isSupported()) {
        this.firebaseAnalytics = getAnalytics(firebaseApp);
        // Flush queued events
        for (const e of this.eventQueue) {
          this.sendEvent(e.name, e.props);
        }
        this.eventQueue = [];
      }
    } catch {
      // Analytics optional
    }
  }

  track(eventName: string, properties: EventProperties = {}): void {
    const enriched = {
      game_id: this.gameId,
      session_ms: Date.now() - this.sessionStart,
      ...properties,
    };

    if (this.firebaseAnalytics) {
      this.sendEvent(eventName, enriched);
    } else {
      this.eventQueue.push({ name: eventName, props: enriched });
    }
  }

  trackGameStart(): void {
    this.track('game_start');
  }

  trackGameOver(score: number): void {
    this.track('game_over', { score });
  }

  trackAdImpression(adType: string): void {
    this.track('ad_impression', { ad_type: adType });
  }

  trackPurchase(itemId: string, amount: number): void {
    this.track('purchase', { item_id: itemId, amount });
  }

  trackLevelUp(level: number): void {
    this.track('level_up', { level });
  }

  trackAchievement(achievementId: string): void {
    this.track('achievement_unlocked', { achievement_id: achievementId });
  }

  private async sendEvent(name: string, properties: EventProperties): Promise<void> {
    if (!this.firebaseAnalytics) return;
    try {
      const { logEvent } = await import('firebase/analytics');
      logEvent(this.firebaseAnalytics, name, properties);
    } catch {
      // Fail silently
    }
  }
}
