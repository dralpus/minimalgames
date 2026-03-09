import type { AdUnitIds, RewardResult } from '../config/types';

export type AdPosition = 'top' | 'bottom';

export interface IAdManager {
  init(adClientId: string, adUnitIds: AdUnitIds): void;
  showBanner(position?: AdPosition): void;
  hideBanner(): void;
  showInterstitial(): Promise<void>;
  showRewarded(): Promise<RewardResult>;
  isAdBlockerDetected(): boolean;
}

/**
 * AdManager: Google AdSense integration for web.
 * Interstitial and rewarded ads are simulated via timed overlays
 * until replaced by a proper AdMob bridge (e.g. Capacitor AdMob plugin).
 *
 * In production web: use Google AdSense display ads.
 * In native (Capacitor): replace with @capacitor-community/admob calls.
 */
export class AdManager implements IAdManager {
  private adClientId = '';
  private adUnitIds: AdUnitIds = {};
  private bannerEl: HTMLElement | null = null;
  private initialized = false;

  init(adClientId: string, adUnitIds: AdUnitIds): void {
    this.adClientId = adClientId;
    this.adUnitIds = adUnitIds;
    this.initialized = true;
    this.injectAdScript();
  }

  showBanner(position: AdPosition = 'bottom'): void {
    if (!this.initialized) return;
    this.hideBanner();

    const container = document.createElement('div');
    container.id = 'mg-banner-ad';
    container.style.cssText = `
      position: fixed;
      ${position}: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: #1a1a2e;
      border-${position === 'bottom' ? 'top' : 'bottom'}: 1px solid #333;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9000;
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #888;
    `;

    if (this.adUnitIds.banner && this.adClientId) {
      const ins = document.createElement('ins');
      ins.className = 'adsbygoogle';
      ins.style.cssText = 'display:block;width:100%;height:50px';
      ins.setAttribute('data-ad-client', this.adClientId);
      ins.setAttribute('data-ad-slot', this.adUnitIds.banner);
      container.appendChild(ins);
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      } catch {
        // Ad blocker likely active
      }
    } else {
      container.textContent = '[Advertisement]';
    }

    document.body.appendChild(container);
    this.bannerEl = container;
  }

  hideBanner(): void {
    if (this.bannerEl) {
      this.bannerEl.remove();
      this.bannerEl = null;
    }
  }

  async showInterstitial(): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.createAdOverlay('Interstitial Ad', 5, resolve);
      document.body.appendChild(overlay);
    });
  }

  async showRewarded(): Promise<RewardResult> {
    return new Promise((resolve) => {
      const overlay = this.createAdOverlay(
        'Watch this ad to earn your reward!',
        10,
        () => resolve({ granted: true, rewardType: 'extraLife', rewardAmount: 1 }),
      );

      // Add skip button that grants no reward
      const skipBtn = document.createElement('button');
      skipBtn.textContent = 'Skip (no reward)';
      skipBtn.style.cssText = `
        position: absolute;
        top: 16px;
        right: 16px;
        background: transparent;
        border: 1px solid #666;
        color: #aaa;
        padding: 6px 14px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      `;
      skipBtn.onclick = () => {
        overlay.remove();
        resolve({ granted: false });
      };
      overlay.appendChild(skipBtn);
      document.body.appendChild(overlay);
    });
  }

  isAdBlockerDetected(): boolean {
    return !(window as any).adsbygoogle;
  }

  private createAdOverlay(title: string, countdown: number, onComplete: () => void): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.92);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: Arial, sans-serif;
      color: white;
      gap: 16px;
    `;

    const titleEl = document.createElement('div');
    titleEl.textContent = title;
    titleEl.style.cssText = 'font-size: 18px; font-weight: bold; color: #ccc;';

    const adBox = document.createElement('div');
    adBox.style.cssText = `
      width: min(320px, 90vw);
      height: 250px;
      background: #1a1a2e;
      border: 1px solid #444;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #555;
      font-size: 14px;
    `;
    adBox.textContent = '[Ad Placeholder — configure AdSense/AdMob]';

    const timer = document.createElement('div');
    timer.style.cssText = 'font-size: 28px; font-weight: bold; color: #ff6b35;';

    let remaining = countdown;
    timer.textContent = `${remaining}s`;

    const interval = setInterval(() => {
      remaining--;
      timer.textContent = `${remaining}s`;
      if (remaining <= 0) {
        clearInterval(interval);
        overlay.remove();
        onComplete();
      }
    }, 1000);

    overlay.append(titleEl, adBox, timer);
    return overlay;
  }

  private injectAdScript(): void {
    if (!this.adClientId || document.getElementById('adsense-script')) return;
    const script = document.createElement('script');
    script.id = 'adsense-script';
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${this.adClientId}`;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  }
}
