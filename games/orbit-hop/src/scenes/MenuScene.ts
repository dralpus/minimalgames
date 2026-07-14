import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class MenuScene extends Phaser.Scene {
  private engine!: GameEngine;

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { engine?: GameEngine }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Star parallax background
    this.createStars();

    // Title
    this.add
      .text(width / 2, height * 0.16, 'ORBIT', {
        fontFamily: theme.fontFamily,
        fontSize: '52px',
        color: theme.primary,
        stroke: theme.primary,
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.25, 'HOP', {
        fontFamily: theme.fontFamily,
        fontSize: '52px',
        color: theme.secondary,
        stroke: theme.secondary,
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Animated demo: a small spark orbiting a ring
    this.createOrbitDemo(width / 2, height * 0.42);

    // Best score
    const best = this.engine.storage.get<number>('bestScore', 0);
    if (best > 0) {
      this.add
        .text(width / 2, height * 0.58, `BEST: ${best}`, {
          fontFamily: theme.fontFamily,
          fontSize: '18px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
    }

    // Coins
    const coins = this.engine.currency.getBalance();
    this.add
      .text(width / 2, height * 0.63, `💎 ${coins}`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.accent,
      })
      .setOrigin(0.5);

    // Player level
    const level = this.engine.xp.getLevel();
    const xp = this.engine.xp.getXP();
    this.add
      .text(width / 2, height * 0.68, `LEVEL ${level} · ${xp} XP`, {
        fontFamily: theme.fontFamily,
        fontSize: '13px',
        color: '#666688',
      })
      .setOrigin(0.5);

    // Play button
    const btn = this.add
      .text(width / 2, height * 0.78, '▶  PLAY', {
        fontFamily: theme.fontFamily,
        fontSize: '26px',
        color: '#000',
        backgroundColor: theme.primary,
        padding: { x: 32, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn,
      scaleX: 1.04,
      scaleY: 1.04,
      yoyo: true,
      repeat: -1,
      duration: 900,
      ease: 'Sine.easeInOut',
    });

    btn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    // Leaderboard button
    const lbBtn = this.add
      .text(width / 2, height * 0.88, '🏆 LEADERBOARD', {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.accent,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    lbBtn.on('pointerdown', () => this.showLeaderboard());

    // Version
    this.add
      .text(width / 2, height - 16, `v${GAME_CONFIG.version}`, {
        fontFamily: theme.fontFamily,
        fontSize: '11px',
        color: '#333355',
      })
      .setOrigin(0.5);
  }

  private createStars(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.FloatBetween(0.5, 1.8);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.9);
      this.add.circle(x, y, r, 0xffffff, alpha);
    }
  }

  private createOrbitDemo(cx: number, cy: number): void {
    const ringRadius = 46;

    // Planet
    this.add.circle(cx, cy, 18, 0x7c6cf0);
    const glow = this.add.circle(cx, cy, 24, 0x7c6cf0, 0.12);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.05 },
      yoyo: true,
      repeat: -1,
      duration: 1200,
    });

    // Ring
    this.add.circle(cx, cy, ringRadius).setStrokeStyle(2, 0x40e0d0, 0.5);

    // Orbiting spark
    const spark = this.add.circle(cx + ringRadius, cy, 6, 0xffffff);
    const demo = { angle: 0 };
    this.tweens.add({
      targets: demo,
      angle: 360,
      duration: 3000,
      repeat: -1,
      ease: 'Linear',
      onUpdate: () => {
        const rad = Phaser.Math.DegToRad(demo.angle);
        spark.x = cx + Math.cos(rad) * ringRadius;
        spark.y = cy + Math.sin(rad) * ringRadius;
      },
    });
  }

  private async showLeaderboard(): Promise<void> {
    const entries = await this.engine.leaderboard.getTopScores(10);
    const rank = await this.engine.leaderboard.getUserRank();
    const user = this.engine.auth.getCurrentUser();

    let bodyHTML = '<div style="text-align:left;width:100%;">';
    if (entries.length === 0) {
      bodyHTML += '<p style="color:#888;text-align:center;">No scores yet. Be the first!</p>';
    } else {
      entries.forEach((e) => {
        const isMe = user && e.uid === user.uid;
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;color:${isMe ? '#7c6cf0' : 'white'}">
          <span>#${e.rank} ${e.displayName}${isMe ? ' (you)' : ''}</span>
          <span>${e.score}</span>
        </div>`;
      });
    }
    if (rank > 0) {
      bodyHTML += `<p style="margin-top:12px;color:#666;text-align:center;font-size:13px;">Your rank: #${rank}</p>`;
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
