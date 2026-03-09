import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private engine!: GameEngine;
  private score = 0;
  private distance = 0;
  private gems = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { engine: GameEngine; score: number; distance: number; gems: number }): void {
    this.engine = data.engine;
    this.score = data.score;
    this.distance = data.distance;
    this.gems = data.gems;
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    const bestDist = this.engine.storage.get<number>('bestDistance', 0);
    const bestScore = this.engine.storage.get<number>('bestScore', 0);
    const isNewBest = this.score > bestScore;

    if (isNewBest) {
      this.engine.storage.set('bestScore', this.score);
      this.engine.storage.set('bestDistance', this.distance);
    }
    await this.engine.leaderboard.submitScore(this.score);

    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a3e, 0x1a1a3e, 1);
    sky.fillRect(0, 0, width, height);

    this.add.text(width / 2, height * 0.12, 'GAME OVER', {
      fontFamily: theme.fontFamily,
      fontSize: '38px',
      color: theme.accent,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Stats
    const statsY = height * 0.27;
    this.add.text(width / 2, statsY, `${this.distance}m`, {
      fontFamily: theme.fontFamily,
      fontSize: '56px',
      color: 'white',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, statsY + 50, 'DISTANCE', {
      fontFamily: theme.fontFamily,
      fontSize: '14px',
      color: '#666688',
    }).setOrigin(0.5);

    this.add.text(width / 3, height * 0.46, `${this.score}`, {
      fontFamily: theme.fontFamily,
      fontSize: '28px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 3, height * 0.46 + 24, 'SCORE', {
      fontFamily: theme.fontFamily,
      fontSize: '12px',
      color: '#666',
    }).setOrigin(0.5);

    this.add.text(2 * width / 3, height * 0.46, `💎 ${this.gems}`, {
      fontFamily: theme.fontFamily,
      fontSize: '28px',
      color: '#ffd700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(2 * width / 3, height * 0.46 + 24, 'GEMS', {
      fontFamily: theme.fontFamily,
      fontSize: '12px',
      color: '#666',
    }).setOrigin(0.5);

    if (isNewBest) {
      const badge = this.add.text(width / 2, height * 0.54, '🌟 NEW BEST!', {
        fontFamily: theme.fontFamily,
        fontSize: '20px',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.tweens.add({ targets: badge, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 500 });
    } else {
      this.add.text(width / 2, height * 0.54, `Best: ${bestDist}m`, {
        fontFamily: theme.fontFamily,
        fontSize: '15px',
        color: '#555577',
      }).setOrigin(0.5);
    }

    // XP earned
    const xpEarned = Math.floor(this.score / 15) + this.gems * 2;
    this.engine.xp.addXP(xpEarned);
    this.add.text(width / 2, height * 0.60, `+${xpEarned} XP`, {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.secondary,
    }).setOrigin(0.5);

    // Continue (rewarded ad)
    const continueBtn = this.add.text(width / 2, height * 0.68, '▶  CONTINUE (ad)', {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#000',
      backgroundColor: theme.accent,
      padding: { x: 22, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    continueBtn.on('pointerdown', async () => {
      continueBtn.setInteractive(false);
      await this.engine.showRewardedAd(() => {
        this.scene.start('GameScene', { engine: this.engine });
      });
      continueBtn.setInteractive(true);
    });

    // Retry
    const retryBtn = this.add.text(width / 2, height * 0.78, '↺  TRY AGAIN', {
      fontFamily: theme.fontFamily,
      fontSize: '20px',
      color: theme.primary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    const menuBtn = this.add.text(width / 2, height * 0.87, '⌂ MENU', {
      fontFamily: theme.fontFamily,
      fontSize: '15px',
      color: '#666688',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { engine: this.engine });
    });
  }
}
