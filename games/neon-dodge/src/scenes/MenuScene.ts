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

    // Animated background grid
    this.createGrid();

    // Title glow
    this.add
      .text(width / 2, height * 0.22, 'NEON', {
        fontFamily: theme.fontFamily,
        fontSize: '56px',
        color: theme.primary,
        stroke: theme.primary,
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.32, 'DODGE', {
        fontFamily: theme.fontFamily,
        fontSize: '56px',
        color: theme.secondary,
        stroke: theme.secondary,
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    // Best score
    const best = this.engine.storage.get<number>('bestScore', 0);
    if (best > 0) {
      this.add
        .text(width / 2, height * 0.46, `BEST: ${best}`, {
          fontFamily: theme.fontFamily,
          fontSize: '20px',
          color: '#aaaaaa',
        })
        .setOrigin(0.5);
    }

    // Player level
    const level = this.engine.xp.getLevel();
    const xp = this.engine.xp.getXP();
    this.add
      .text(width / 2, height * 0.52, `LEVEL ${level} · ${xp} XP`, {
        fontFamily: theme.fontFamily,
        fontSize: '14px',
        color: '#666688',
      })
      .setOrigin(0.5);

    // Play button
    const btn = this.add
      .text(width / 2, height * 0.64, '▶  PLAY', {
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
      .text(width / 2, height * 0.75, '🏆 LEADERBOARD', {
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

  private createGrid(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x001133, 0.6);
    const step = 40;
    for (let x = 0; x <= width; x += step) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += step) gfx.lineBetween(0, y, width, y);
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
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;color:${isMe ? '#00f5ff' : 'white'}">
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
