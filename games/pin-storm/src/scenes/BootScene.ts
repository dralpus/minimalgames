import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    // Loading screen
    const { width, height } = this.scale;
    const bar = this.add.rectangle(width / 2, height / 2, 300, 6, 0xff6b35);
    bar.setOrigin(0.5);

    const fill = this.add.rectangle(width / 2 - 150, height / 2, 0, 6, 0x00b4ff);
    fill.setOrigin(0, 0.5);

    this.add
      .text(width / 2, height / 2 - 30, 'PIN STORM', {
        fontFamily: '"Rajdhani", "Arial Narrow", sans-serif',
        fontSize: '28px',
        color: '#ff6b35',
      })
      .setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      fill.width = 300 * value;
    });

    // No external assets — all drawn procedurally
  }

  create(): void {
    this.scene.start('MenuScene', { engine: this.game.registry.get('engine') });
  }
}
