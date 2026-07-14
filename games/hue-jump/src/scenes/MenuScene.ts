import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG, COLORS } from '../config';

export class MenuScene extends Phaser.Scene {
  private engine!: GameEngine;
  private demoOrb!: Phaser.GameObjects.Arc;
  private demoColorElapsed = 0;
  private demoColorIndex = 0;
  private dots: Array<{ obj: Phaser.GameObjects.Arc; speed: number }> = [];

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { engine?: GameEngine }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    this.demoColorElapsed = 0;
    this.demoColorIndex = 0;
    this.dots = [];

    // Vertical gradient background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1f1930, 0x1f1930, 0x0b0812, 0x0b0812, 1);
    bg.fillRect(0, 0, width, height);

    // Floating decorative color dots drifting upward
    for (let i = 0; i < 18; i++) {
      const color = COLORS[i % COLORS.length];
      const dot = this.add.circle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 5),
        color,
        0.55,
      );
      this.dots.push({ obj: dot, speed: Phaser.Math.FloatBetween(12, 40) });
    }

    // Title
    this.add
      .text(width / 2, height * 0.18, 'HUE', {
        fontFamily: theme.fontFamily,
        fontSize: '58px',
        color: theme.primary,
        stroke: theme.primary,
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.27, 'JUMP', {
        fontFamily: theme.fontFamily,
        fontSize: '58px',
        color: theme.secondary,
        stroke: theme.secondary,
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Animated demo orb — bounces and cycles color
    this.demoOrb = this.add.circle(width / 2, height * 0.4, 16, COLORS[0]);
    this.tweens.add({
      targets: this.demoOrb,
      y: height * 0.4 - 26,
      yoyo: true,
      repeat: -1,
      duration: 550,
      ease: 'Sine.easeInOut',
    });

    // Best height
    const best = this.engine.storage.get<number>('bestHeight', 0);
    if (best > 0) {
      this.add
        .text(width / 2, height * 0.5, `BEST: ${best}m`, {
          fontFamily: theme.fontFamily,
          fontSize: '20px',
          color: '#cccccc',
        })
        .setOrigin(0.5);
    }

    // Lifetime stars
    const stars = this.engine.storage.get<number>('lifetimeStars', 0);
    this.add
      .text(width / 2, height * 0.56, `⭐ ${stars}`, {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: '#ffcc00',
      })
      .setOrigin(0.5);

    // Player level
    const level = this.engine.xp.getLevel();
    this.add
      .text(width / 2, height * 0.61, `LEVEL ${level}`, {
        fontFamily: theme.fontFamily,
        fontSize: '13px',
        color: '#8877aa',
      })
      .setOrigin(0.5);

    // Play button
    const btn = this.add
      .text(width / 2, height * 0.72, '▶  PLAY', {
        fontFamily: theme.fontFamily,
        fontSize: '28px',
        color: '#16121f',
        backgroundColor: theme.primary,
        padding: { x: 34, y: 14 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: btn,
      scaleX: 1.05,
      scaleY: 1.05,
      yoyo: true,
      repeat: -1,
      duration: 850,
      ease: 'Sine.easeInOut',
    });

    btn.on('pointerdown', () => {
      this.scene.start('GameScene', { engine: this.engine });
    });

    // Leaderboard button
    const lbBtn = this.add
      .text(width / 2, height * 0.82, '🏆 LEADERBOARD', {
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
        color: '#443a5a',
      })
      .setOrigin(0.5);
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    const { height } = this.scale;

    // Drift decorative dots upward, recycle at top
    for (const d of this.dots) {
      d.obj.y -= d.speed * dt;
      if (d.obj.y < -10) {
        d.obj.y = height + 10;
        d.obj.x = Phaser.Math.Between(10, this.scale.width - 10);
      }
    }

    // Cycle demo orb color every 700ms
    this.demoColorElapsed += delta;
    if (this.demoColorElapsed >= 700) {
      this.demoColorElapsed -= 700;
      this.demoColorIndex = (this.demoColorIndex + 1) % COLORS.length;
      this.demoOrb.setFillStyle(COLORS[this.demoColorIndex]);
    }
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
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;color:${isMe ? '#33ddff' : 'white'}">
          <span>#${e.rank} ${e.displayName}${isMe ? ' (you)' : ''}</span>
          <span>${e.score}m</span>
        </div>`;
      });
    }
    if (rank > 0) {
      bodyHTML += `<p style="margin-top:12px;color:#666;text-align:center;font-size:13px;">Your rank: #${rank}</p>`;
    }
    bodyHTML += '</div>';

    this.engine.modal.show({
      title: '🏆 Top Heights',
      bodyHTML,
      theme: GAME_CONFIG.theme,
      actions: [{ label: 'Close', primary: true, onClick: () => {} }],
    });
  }
}
