import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private engine!: GameEngine;
  private score = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { engine: GameEngine; score: number }): void {
    this.engine = data.engine;
    this.score = data.score;
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Persist score
    const best = this.engine.storage.get<number>('bestScore', 0);
    const isNewBest = this.score > best;
    if (isNewBest) {
      this.engine.storage.set('bestScore', this.score);
    }
    await this.engine.leaderboard.submitScore(this.score);

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000011);

    // Game Over title
    this.add.text(width / 2, height * 0.16, 'GAME OVER', {
      fontFamily: theme.fontFamily,
      fontSize: '38px',
      color: '#ff4444',
    }).setOrigin(0.5);

    // Score display
    this.add.text(width / 2, height * 0.30, `SCORE\n${this.score}`, {
      fontFamily: theme.fontFamily,
      fontSize: '48px',
      color: theme.primary,
      align: 'center',
    }).setOrigin(0.5);

    if (isNewBest) {
      const newBest = this.add.text(width / 2, height * 0.44, '★ NEW BEST! ★', {
        fontFamily: theme.fontFamily,
        fontSize: '20px',
        color: '#ffd700',
      }).setOrigin(0.5);
      this.tweens.add({
        targets: newBest,
        scaleX: 1.1,
        scaleY: 1.1,
        yoyo: true,
        repeat: -1,
        duration: 600,
      });
      this.engine.toast.success('New personal best!');
    } else {
      this.add.text(width / 2, height * 0.44, `BEST: ${best}`, {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: '#666688',
      }).setOrigin(0.5);
    }

    // XP earned
    const xpEarned = Math.floor(this.score / 10);
    const xpResult = this.engine.xp.addXP(xpEarned);
    this.add.text(width / 2, height * 0.51, `+${xpEarned} XP`, {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.accent,
    }).setOrigin(0.5);

    if (xpResult.leveledUp) {
      this.add.text(width / 2, height * 0.56, `LEVEL UP → ${xpResult.newLevel}!`, {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: theme.secondary,
      }).setOrigin(0.5);
    }

    // Revive button (rewarded ad)
    const reviveBtn = this.add.text(width / 2, height * 0.65, '▶  REVIVE (watch ad)', {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#000',
      backgroundColor: theme.accent,
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    reviveBtn.on('pointerdown', async () => {
      reviveBtn.setInteractive(false);
      await this.engine.showRewardedAd(() => {
        this.scene.start('GameScene', { engine: this.engine });
      });
      reviveBtn.setInteractive(true);
    });

    // Play again
    const replayBtn = this.add.text(width / 2, height * 0.75, '↺  PLAY AGAIN', {
      fontFamily: theme.fontFamily,
      fontSize: '20px',
      color: theme.primary,
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    // Menu
    const menuBtn = this.add.text(width / 2, height * 0.84, '⌂  MENU', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: '#666688',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { engine: this.engine });
    });
  }
}
