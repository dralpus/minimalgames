import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG, GAME_WIDTH, GAME_HEIGHT } from '../config';

export class MenuScene extends Phaser.Scene {
  private engine!: GameEngine;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { engine: GameEngine }): void {
    this.engine = data.engine;
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Silhouette background
    this.createBackground();

    // Title
    this.add.text(width / 2, height * 0.20, 'GRAVITY', {
      fontFamily: theme.fontFamily,
      fontSize: '52px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.30, 'FLIP', {
      fontFamily: theme.fontFamily,
      fontSize: '52px',
      color: theme.secondary,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // Animated player silhouette
    const player = this.add.rectangle(width / 2, height * 0.42, 28, 28, 0xffffff);
    this.tweens.add({
      targets: player,
      y: height * 0.42 - 30,
      yoyo: true,
      repeat: -1,
      duration: 600,
      ease: 'Sine.easeInOut',
    });

    this.add.text(width / 2, height * 0.50, 'TAP TO FLIP GRAVITY', {
      fontFamily: theme.fontFamily,
      fontSize: '14px',
      color: '#aaaacc',
    }).setOrigin(0.5);

    const best = this.engine.storage.get<number>('bestDistance', 0);
    const bestScore = this.engine.storage.get<number>('bestScore', 0);
    if (best > 0) {
      this.add.text(width / 2, height * 0.58, `BEST: ${best}m · ${bestScore} pts`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: '#666688',
      }).setOrigin(0.5);
    }

    const coins = this.engine.currency.getBalance();
    this.add.text(width / 2, height * 0.63, `💎 ${coins}`, {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: theme.primary,
    }).setOrigin(0.5);

    const playBtn = this.add.text(width / 2, height * 0.73, '  RUN  ', {
      fontFamily: theme.fontFamily,
      fontSize: '28px',
      color: '#000',
      backgroundColor: theme.primary,
      padding: { x: 36, y: 16 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({ targets: playBtn, scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 800 });
    playBtn.on('pointerdown', () => this.scene.start('GameScene', { engine: this.engine }));

    const lbBtn = this.add.text(width / 2, height * 0.84, '🏆 Leaderboard', {
      fontFamily: theme.fontFamily,
      fontSize: '16px',
      color: theme.secondary,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerdown', () => this.showLeaderboard());
  }

  private createBackground(): void {
    const { width, height } = this.scale;
    // Sky gradient
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a3e, 0x1a1a3e, 1);
    sky.fillRect(0, 0, width, height);

    // Ground line
    this.add.rectangle(width / 2, height - 20, width, 4, 0x2ec4b6, 0.4);
    // Ceiling line
    this.add.rectangle(width / 2, 20, width, 4, 0xff9f1c, 0.4);

    // Stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Math.random() < 0.8 ? 1 : 2;
      this.add.circle(x, y, r, 0xffffff, Math.random() * 0.6 + 0.2);
    }
  }

  private async showLeaderboard(): Promise<void> {
    const entries = await this.engine.leaderboard.getTopScores(10);
    let bodyHTML = '<div style="text-align:left;width:100%;">';
    if (entries.length === 0) {
      bodyHTML += '<p style="color:#888;text-align:center;">No runs yet!</p>';
    } else {
      entries.forEach((e) => {
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;">
          <span>#${e.rank} ${e.displayName}</span><span>${e.score} pts</span>
        </div>`;
      });
    }
    bodyHTML += '</div>';
    this.engine.modal.show({
      title: '🏆 Top Runs',
      bodyHTML,
      theme: GAME_CONFIG.theme,
      actions: [{ label: 'Close', primary: true, onClick: () => {} }],
    });
  }
}
