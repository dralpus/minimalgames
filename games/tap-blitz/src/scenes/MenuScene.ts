import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG, TARGET_COLORS } from '../config';

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

    // Animated color blob background
    this.createBlobBg();

    this.add.text(width / 2, height * 0.18, '👆', {
      fontSize: '72px',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.30, 'TAP BLITZ', {
      fontFamily: theme.fontFamily,
      fontSize: '44px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.38, 'Tap the right color!', {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#aaaacc',
    }).setOrigin(0.5);

    const best = this.engine.storage.get<number>('bestScore', 0);
    if (best > 0) {
      this.add.text(width / 2, height * 0.46, `BEST: ${best} pts`, {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: '#888',
      }).setOrigin(0.5);
    }

    const playBtn = this.add.text(width / 2, height * 0.58, '  PLAY  ', {
      fontFamily: theme.fontFamily,
      fontSize: '28px',
      color: 'white',
      backgroundColor: theme.primary,
      padding: { x: 36, y: 16 },
      borderRadius: 16,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: playBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 800,
    });

    playBtn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    const lbBtn = this.add.text(width / 2, height * 0.69, '🏆 Top Scores', {
      fontFamily: theme.fontFamily,
      fontSize: '17px',
      color: theme.accent,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    lbBtn.on('pointerdown', () => this.showLeaderboard());

    // Color key preview
    this.add.text(width / 2, height * 0.80, 'Colors:', {
      fontFamily: theme.fontFamily,
      fontSize: '13px',
      color: '#555',
    }).setOrigin(0.5);

    TARGET_COLORS.forEach((c, i) => {
      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = width / 2 - 60 + col * 60;
      const y = height * 0.85 + row * 36;
      this.add.circle(x, y, 14, c.hex).setInteractive(false);
    });
  }

  private createBlobBg(): void {
    const { width, height } = this.scale;
    const colors = [0xe63946, 0x4361ee, 0x2dc653, 0xffd60a, 0xf72585, 0x4cc9f0];
    colors.forEach((c, i) => {
      const x = Phaser.Math.Between(20, width - 20);
      const y = Phaser.Math.Between(20, height - 20);
      const r = Phaser.Math.Between(40, 80);
      const blob = this.add.circle(x, y, r, c, 0.08);
      this.tweens.add({
        targets: blob,
        x: x + Phaser.Math.Between(-30, 30),
        y: y + Phaser.Math.Between(-30, 30),
        yoyo: true,
        repeat: -1,
        duration: 2000 + i * 400,
        ease: 'Sine.easeInOut',
      });
    });
  }

  private async showLeaderboard(): Promise<void> {
    const entries = await this.engine.leaderboard.getTopScores(10);
    let bodyHTML = '<div style="text-align:left;width:100%;">';
    if (entries.length === 0) {
      bodyHTML += '<p style="color:#888;text-align:center;">No scores yet!</p>';
    } else {
      entries.forEach((e) => {
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;">
          <span>#${e.rank} ${e.displayName}</span><span>${e.score}</span>
        </div>`;
      });
    }
    bodyHTML += '</div>';
    this.engine.modal.show({
      title: '🏆 Top Scores',
      bodyHTML,
      theme: GAME_CONFIG.theme,
      actions: [{ label: 'Close', primary: true, onClick: () => {} }],
    });
  }
}
