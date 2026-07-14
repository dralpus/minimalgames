import Phaser from 'phaser';
import type { GameEngine } from '@core';
import { GAME_CONFIG } from '../config';

export class MenuScene extends Phaser.Scene {
  private engine!: GameEngine;
  private wheelGfx!: Phaser.GameObjects.Graphics;
  private wheelPins!: Phaser.GameObjects.Graphics;
  private wheelRotation = 0;
  private wheelCenterX = 0;
  private wheelCenterY = 0;
  private decoAngles: number[] = [20, 95, 160, 230, 300];

  constructor() {
    super({ key: 'MenuScene' });
  }

  init(data: { engine?: GameEngine }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x12141c);
    this.createGrid();

    // Decorative spinning wheel
    this.wheelCenterX = width / 2;
    this.wheelCenterY = height * 0.32;
    this.wheelGfx = this.add.graphics();
    this.wheelPins = this.add.graphics();
    this.drawDecoWheel();

    // Title
    this.add
      .text(width / 2, height * 0.11, 'PIN STORM', {
        fontFamily: theme.fontFamily,
        fontSize: '46px',
        color: theme.primary,
        stroke: theme.primary,
        strokeThickness: 1,
      })
      .setOrigin(0.5);

    // Saved level progress
    const level = this.engine.storage.get<number>('level', 1);
    this.add
      .text(width / 2, height * 0.58, `LEVEL ${level}`, {
        fontFamily: theme.fontFamily,
        fontSize: '22px',
        color: '#aaaaaa',
      })
      .setOrigin(0.5);

    // Coins display
    const coins = this.engine.currency.getBalance();
    this.add
      .text(width / 2, height * 0.63, `💰 ${coins}`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.accent,
      })
      .setOrigin(0.5);

    // Player level / XP
    const xpLevel = this.engine.xp.getLevel();
    const xp = this.engine.xp.getXP();
    this.add
      .text(width / 2, height * 0.68, `XP LEVEL ${xpLevel} · ${xp} XP`, {
        fontFamily: theme.fontFamily,
        fontSize: '13px',
        color: '#666688',
      })
      .setOrigin(0.5);

    // Play button
    const btn = this.add
      .text(width / 2, height * 0.77, '▶  PLAY', {
        fontFamily: theme.fontFamily,
        fontSize: '26px',
        color: '#12141c',
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
      .text(width / 2, height * 0.87, '🏆 LEADERBOARD', {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.secondary,
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

  update(_time: number, delta: number): void {
    // Slow decorative rotation driven by elapsed time, not a TimerEvent
    this.wheelRotation += 12 * (delta / 1000);
    this.drawDecoWheel();
  }

  private drawDecoWheel(): void {
    const radius = 70;
    this.wheelGfx.clear();
    this.wheelGfx.fillStyle(0x1e2230, 1);
    this.wheelGfx.fillCircle(this.wheelCenterX, this.wheelCenterY, radius);
    this.wheelGfx.lineStyle(3, 0x00b4ff, 1);
    this.wheelGfx.strokeCircle(this.wheelCenterX, this.wheelCenterY, radius);
    this.wheelGfx.fillStyle(0x00b4ff, 1);
    this.wheelGfx.fillCircle(this.wheelCenterX, this.wheelCenterY, 6);

    this.wheelPins.clear();
    for (const angle of this.decoAngles) {
      const rad = Phaser.Math.DegToRad(angle + this.wheelRotation);
      const tipX = this.wheelCenterX + Math.cos(rad) * radius;
      const tipY = this.wheelCenterY + Math.sin(rad) * radius;
      const headX = this.wheelCenterX + Math.cos(rad) * (radius + 16);
      const headY = this.wheelCenterY + Math.sin(rad) * (radius + 16);
      this.wheelPins.lineStyle(3, 0xff6b35, 1);
      this.wheelPins.lineBetween(tipX, tipY, headX, headY);
      this.wheelPins.fillStyle(0xff6b35, 1);
      this.wheelPins.fillCircle(headX, headY, 4);
    }
  }

  private createGrid(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a1d29, 0.6);
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
        bodyHTML += `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #222;color:${isMe ? '#ff6b35' : 'white'}">
          <span>#${e.rank} ${e.displayName}${isMe ? ' (you)' : ''}</span>
          <span>Level ${e.score}</span>
        </div>`;
      });
    }
    if (rank > 0) {
      bodyHTML += `<p style="margin-top:12px;color:#666;text-align:center;font-size:13px;">Your rank: #${rank}</p>`;
    }
    bodyHTML += '</div>';

    this.engine.modal.show({
      title: '🏆 Top Levels',
      bodyHTML,
      theme: GAME_CONFIG.theme,
      actions: [{ label: 'Close', primary: true, onClick: () => {} }],
    });
  }
}
