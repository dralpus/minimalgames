import Phaser from 'phaser';
import type { GameEngine } from '@core';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Loading screen
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 300, 6, 0x00f5ff);
    bar.setOrigin(0.5);

    const fill = this.add.rectangle(width / 2 - 150, height / 2, 0, 6, 0xff00ff);
    fill.setOrigin(0, 0.5);

    const label = this.add
      .text(width / 2, height / 2 - 30, 'NEON DODGE', {
        fontFamily: '"Orbitron", monospace',
        fontSize: '28px',
        color: '#00f5ff',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fill.width = 300 * value;
    });

    // No external assets — all drawn procedurally
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
