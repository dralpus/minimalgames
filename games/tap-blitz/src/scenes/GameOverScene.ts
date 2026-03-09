import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private engine!: GameEngine;
  private score = 0;
  private bestStreak = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { engine: GameEngine; score: number; streak: number }): void {
    this.engine = data.engine;
    this.score = data.score;
    this.bestStreak = data.streak;
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    const best = this.engine.storage.get<number>('bestScore', 0);
    const isNewBest = this.score > best;
    if (isNewBest) this.engine.storage.set('bestScore', this.score);
    await this.engine.leaderboard.submitScore(this.score);

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.14, 'TIME\'S UP!', {
      fontFamily: theme.fontFamily,
      fontSize: '38px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.28, String(this.score), {
      fontFamily: theme.fontFamily,
      fontSize: '72px',
      color: 'white',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'POINTS', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: '#888',
    }).setOrigin(0.5);

    if (isNewBest) {
      const badge = this.add.text(width / 2, height * 0.46, '🌟 NEW BEST!', {
        fontFamily: theme.fontFamily,
        fontSize: '22px',
        color: '#ffd700',
        fontStyle: 'bold',
      }).setOrigin(0.5);
      this.tweens.add({ targets: badge, scaleX: 1.08, scaleY: 1.08, yoyo: true, repeat: -1, duration: 500 });
    }

    const bestStrText = this.engine.storage.get<number>('bestStreak', 0);
    if (this.bestStreak > bestStrText) {
      this.engine.storage.set('bestStreak', this.bestStreak);
      this.engine.achievements.unlock('streak_' + this.bestStreak);
    }

    this.add.text(width / 2, height * 0.52, `Best streak: ${Math.max(this.bestStreak, bestStrText)} 🔥`, {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: '#ff6b35',
    }).setOrigin(0.5);

    // XP earned
    const xpEarned = Math.floor(this.score / 20);
    this.engine.xp.addXP(xpEarned);
    this.add.text(width / 2, height * 0.58, `+${xpEarned} XP`, {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.accent,
    }).setOrigin(0.5);

    // Play again
    const playBtn = this.add.text(width / 2, height * 0.68, '  PLAY AGAIN  ', {
      fontFamily: theme.fontFamily,
      fontSize: '22px',
      color: 'white',
      backgroundColor: theme.primary,
      padding: { x: 28, y: 14 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    // Revive with ad
    const reviveBtn = this.add.text(width / 2, height * 0.79, '⏱ +10s (watch ad)', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.accent,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    reviveBtn.on('pointerdown', async () => {
      await this.engine.showRewardedAd(() => {
        this.scene.start('GameScene', { engine: this.engine });
      });
    });

    const menuBtn = this.add.text(width / 2, height * 0.87, '⌂ MENU', {
      fontFamily: theme.fontFamily,
      fontSize: '15px',
      color: '#666',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { engine: this.engine });
    });
  }
}
