import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private engine!: GameEngine;
  private height = 0;
  private stars = 0;
  private revived = false;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { engine?: GameEngine; height?: number; stars?: number; revived?: boolean }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
    this.height = data.height ?? 0;
    this.stars = data.stars ?? 0;
    this.revived = data.revived === true;
  }

  async create(): Promise<void> {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Persist best height
    const best = this.engine.storage.get<number>('bestHeight', 0);
    const isNewBest = this.height > best;
    if (isNewBest) {
      this.engine.storage.set('bestHeight', this.height);
    }
    await this.engine.leaderboard.submitScore(this.height);

    this.add.rectangle(width / 2, height / 2, width, height, 0x16121f);

    this.add.text(width / 2, height * 0.12, 'GAME OVER', {
      fontFamily: theme.fontFamily,
      fontSize: '36px',
      color: '#ff3366',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.25, `${this.height} m`, {
      fontFamily: theme.fontFamily,
      fontSize: '48px',
      color: theme.primary,
      align: 'center',
    }).setOrigin(0.5);

    if (isNewBest) {
      const newBest = this.add.text(width / 2, height * 0.36, '★ NEW BEST! ★', {
        fontFamily: theme.fontFamily,
        fontSize: '20px',
        color: '#ffcc00',
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
      this.add.text(width / 2, height * 0.36, `BEST: ${best} m`, {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: '#8877aa',
      }).setOrigin(0.5);
    }

    this.add.text(width / 2, height * 0.44, `⭐ ${this.stars} collected`, {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#ffcc00',
    }).setOrigin(0.5);

    // XP grant: floor(height/5) + stars
    const xpEarned = Math.floor(this.height / 5) + this.stars;
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

    let nextY = 0.65;

    if (this.revived !== true) {
      const reviveBtn = this.add.text(width / 2, height * nextY, '⚡ REVIVE (watch ad)', {
        fontFamily: theme.fontFamily,
        fontSize: '17px',
        color: '#16121f',
        backgroundColor: theme.accent,
        padding: { x: 20, y: 12 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true });

      reviveBtn.on('pointerdown', async () => {
        reviveBtn.disableInteractive();
        await this.engine.showRewardedAd(() => {
          this.scene.start('GameScene', {
            engine: this.engine,
            resumeHeight: this.height,
            revived: true,
          });
        });
        reviveBtn.setInteractive({ useHandCursor: true });
      });

      nextY += 0.1;
    }

    const replayBtn = this.add.text(width / 2, height * nextY, '↺  PLAY AGAIN', {
      fontFamily: theme.fontFamily,
      fontSize: '20px',
      color: theme.primary,
      padding: { x: 20, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    nextY += 0.09;

    const menuBtn = this.add.text(width / 2, height * nextY, '⌂  MENU', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: '#8877aa',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerdown', () => {
      this.scene.start('MenuScene', { engine: this.engine });
    });
  }
}
