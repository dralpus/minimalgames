import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private engine!: GameEngine;
  private level = 1;
  private runScore = 0;
  private pinsOnWheelAtFail = 0;
  private showAd = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: {
    engine: GameEngine;
    level: number;
    runScore: number;
    pinsOnWheelAtFail: number;
    showAd: boolean;
  }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
    this.level = data.level;
    this.runScore = data.runScore;
    this.pinsOnWheelAtFail = data.pinsOnWheelAtFail;
    this.showAd = data.showAd;
  }

  async create(): Promise<void> {
    if (this.showAd) {
      await this.engine.showInterstitialAd();
    }

    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    const bestLevel = this.engine.storage.get<number>('bestLevel', 1);
    const isNewBest = this.level > bestLevel;
    if (isNewBest) {
      this.engine.storage.set('bestLevel', this.level);
    }

    this.add.rectangle(width / 2, height / 2, width, height, 0x12141c);

    this.add.text(width / 2, height * 0.13, 'WHEEL JAMMED!', {
      fontFamily: theme.fontFamily,
      fontSize: '34px',
      color: '#ff4444',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.26, `LEVEL ${this.level}`, {
      fontFamily: theme.fontFamily,
      fontSize: '44px',
      color: theme.primary,
      align: 'center',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.34, `SCORE: ${this.runScore}`, {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#aaaaaa',
    }).setOrigin(0.5);

    if (isNewBest) {
      const newBest = this.add.text(width / 2, height * 0.41, '★ NEW BEST! ★', {
        fontFamily: theme.fontFamily,
        fontSize: '20px',
        color: theme.accent,
      }).setOrigin(0.5);
      this.tweens.add({
        targets: newBest,
        scaleX: 1.1,
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });
      this.engine.toast.success('New best level!');
    } else {
      this.add.text(width / 2, height * 0.41, `BEST: LEVEL ${bestLevel}`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: '#666688',
      }).setOrigin(0.5);
    }

    // XP grant
    const xpEarned = this.level * 5;
    const xpResult = this.engine.xp.addXP(xpEarned);
    this.add.text(width / 2, height * 0.48, `+${xpEarned} XP`, {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.secondary,
    }).setOrigin(0.5);

    if (xpResult.leveledUp) {
      this.add.text(width / 2, height * 0.53, `LEVEL UP → ${xpResult.newLevel}!`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.accent,
      }).setOrigin(0.5);
    }

    let nextY = 0.63;

    // Rescue (rewarded) — only if the wheel had ≥2 pins on it at the moment of failure
    if (this.pinsOnWheelAtFail >= 2) {
      const rescueBtn = this.add.text(width / 2, height * nextY, '🧹 CLEAR 2 PINS (watch ad)', {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: '#12141c',
        backgroundColor: theme.accent,
        padding: { x: 18, y: 10 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      rescueBtn.on('pointerdown', async () => {
        rescueBtn.disableInteractive();
        await this.engine.showRewardedAd(() => {
          this.scene.start('GameScene', { engine: this.engine, removeTwo: true });
        });
        rescueBtn.setInteractive({ useHandCursor: true });
      });
      nextY += 0.1;
    }

    // Retry (same level)
    const retryBtn = this.add.text(width / 2, height * nextY, '↺  RETRY', {
      fontFamily: theme.fontFamily,
      fontSize: '20px',
      color: theme.primary,
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    retryBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });
    nextY += 0.09;

    // Menu
    const menuBtn = this.add.text(width / 2, height * nextY, '⌂  MENU', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: '#666688',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { engine: this.engine });
    });
  }
}
