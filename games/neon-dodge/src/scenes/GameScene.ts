import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_WIDTH, GAME_HEIGHT, PLAYER_RADIUS, PLAYER_SPEED,
  BAR_WIDTH_MIN, BAR_WIDTH_MAX, BAR_HEIGHT,
  BAR_START_SPEED, BAR_SPEED_INCREMENT,
  BAR_SPAWN_INTERVAL, BAR_SPAWN_DECREMENT,
  SCORE_PER_SECOND, XP_PER_SECOND, GAME_CONFIG,
} from '../config';

interface Bar extends Phaser.GameObjects.Rectangle {
  speed: number;
  glowBar?: Phaser.GameObjects.Rectangle;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private player!: Phaser.GameObjects.Arc;
  private playerTrail!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bars: Bar[] = [];
  private score = 0;
  private lives = 1;
  private difficulty = 1;
  private barSpeed = BAR_START_SPEED;
  private spawnInterval = BAR_SPAWN_INTERVAL;
  private scoreText!: Phaser.GameObjects.Text;
  private livesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private scoreTimer!: Phaser.Time.TimerEvent;
  private isAlive = true;
  private pointerDown = false;
  private pointerX = GAME_WIDTH / 2;
  private invincible = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { engine: GameEngine }): void {
    this.engine = data.engine;
    this.score = 0;
    this.lives = 1;
    this.difficulty = 1;
    this.barSpeed = BAR_START_SPEED;
    this.spawnInterval = BAR_SPAWN_INTERVAL;
    this.isAlive = true;
    this.bars = [];
  }

  create(): void {
    const { width, height } = this.scale;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x000011);
    this.createGrid();

    // Player
    this.player = this.add.circle(width / 2, height - 100, PLAYER_RADIUS, 0x00f5ff);
    this.player.setDepth(10);

    // Glow rings on player
    const glow1 = this.add.circle(width / 2, height - 100, PLAYER_RADIUS + 6, 0x00f5ff, 0.15);
    const glow2 = this.add.circle(width / 2, height - 100, PLAYER_RADIUS + 12, 0x00f5ff, 0.06);
    this.tweens.add({ targets: [glow1, glow2], alpha: { from: 0.15, to: 0.04 }, yoyo: true, repeat: -1, duration: 600 });

    // Score bar
    this.scoreText = this.add.text(12, 12, 'SCORE: 0', {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '18px',
      color: '#00f5ff',
    }).setDepth(20);

    this.livesText = this.add.text(width - 12, 12, '❤ 1', {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '18px',
      color: '#ff6b35',
    }).setDepth(20).setOrigin(1, 0);

    this.levelText = this.add.text(width / 2, 12, `LVL ${this.engine.xp.getLevel()}`, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '16px',
      color: '#666688',
    }).setDepth(20).setOrigin(0.5, 0);

    // Touch controls
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      this.pointerX = p.x;
      this.pointerDown = p.isDown;
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.pointerX = p.x;
      this.pointerDown = true;
    });
    this.input.on('pointerup', () => { this.pointerDown = false; });

    // Spawn bars
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnInterval,
      callback: this.spawnBar,
      callbackScope: this,
      loop: true,
    });

    // Score accumulation
    this.scoreTimer = this.time.addEvent({
      delay: 100,
      callback: this.addScore,
      callbackScope: this,
      loop: true,
    });

    this.engine.analytics.trackGameStart();
  }

  private createGrid(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x001133, 0.4);
    const step = 40;
    for (let x = 0; x <= width; x += step) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += step) gfx.lineBetween(0, y, width, y);
  }

  private spawnBar(): void {
    if (!this.isAlive) return;
    const { width } = this.scale;
    const barW = Phaser.Math.Between(BAR_WIDTH_MIN, BAR_WIDTH_MAX);
    const gap = width - barW;
    const x = Phaser.Math.Between(0, gap) + barW / 2;

    // Alternate cyan and magenta
    const color = this.bars.length % 2 === 0 ? 0x00f5ff : 0xff00ff;
    const bar = this.add.rectangle(x, -BAR_HEIGHT, barW, BAR_HEIGHT, color) as Bar;
    bar.speed = this.barSpeed;
    bar.setDepth(5);

    // Glow clone
    const glowBar = this.add.rectangle(x, -BAR_HEIGHT, barW + 8, BAR_HEIGHT + 8, color, 0.15);
    glowBar.setDepth(4);
    bar.glowBar = glowBar;

    this.bars.push(bar);
  }

  private addScore(): void {
    if (!this.isAlive) return;
    this.score += Math.ceil(SCORE_PER_SECOND / 10 * this.difficulty);
    this.scoreText.setText(`SCORE: ${this.score}`);

    // XP every second (10 ticks × 100ms)
    if (this.scoreTimer.repeatCount % 10 === 0) {
      const result = this.engine.xp.addXP(XP_PER_SECOND);
      if (result.leveledUp) {
        this.levelText.setText(`LVL ${result.newLevel}`);
        this.showLevelUp(result.newLevel);
        this.engine.analytics.trackLevelUp(result.newLevel);
      }
    }
  }

  private showLevelUp(level: number): void {
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height / 2 - 40, `LEVEL UP!\nLEVEL ${level}`, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '32px',
      color: '#ff00ff',
      align: 'center',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: text,
      y: height / 2 - 120,
      alpha: 0,
      duration: 1800,
      ease: 'Power2',
      onComplete: () => text.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    if (!this.isAlive) return;
    const dt = delta / 1000;

    // Move player toward pointer
    if (this.pointerDown) {
      const px = this.player.x;
      const diff = this.pointerX - px;
      const move = Math.min(Math.abs(diff), PLAYER_SPEED * dt);
      this.player.x = px + Math.sign(diff) * move;
    }

    // Clamp to screen
    this.player.x = Phaser.Math.Clamp(
      this.player.x,
      PLAYER_RADIUS,
      this.scale.width - PLAYER_RADIUS,
    );

    // Move bars down and check collisions
    for (let i = this.bars.length - 1; i >= 0; i--) {
      const bar = this.bars[i];
      bar.y += bar.speed * dt;
      if (bar.glowBar) bar.glowBar.y = bar.y;

      // Off-screen cleanup
      if (bar.y > this.scale.height + 50) {
        bar.glowBar?.destroy();
        bar.destroy();
        this.bars.splice(i, 1);

        // Check achievements
        this.checkScoreAchievements();
        continue;
      }

      // Collision check
      if (!this.invincible && this.checkCollision(bar)) {
        this.onHit();
        break;
      }
    }

    // Increase difficulty every 500 points
    const newDifficulty = Math.floor(this.score / 500) + 1;
    if (newDifficulty > this.difficulty) {
      this.difficulty = newDifficulty;
      this.barSpeed = BAR_START_SPEED + (this.difficulty - 1) * BAR_SPEED_INCREMENT;
      this.spawnInterval = Math.max(300, BAR_SPAWN_INTERVAL - (this.difficulty - 1) * BAR_SPAWN_DECREMENT);
      this.spawnTimer.delay = this.spawnInterval;
    }
  }

  private checkCollision(bar: Bar): boolean {
    const px = this.player.x;
    const py = this.player.y;
    const r = PLAYER_RADIUS;
    const bLeft = bar.x - bar.width / 2;
    const bRight = bar.x + bar.width / 2;
    const bTop = bar.y - BAR_HEIGHT / 2;
    const bBot = bar.y + BAR_HEIGHT / 2;

    const closestX = Phaser.Math.Clamp(px, bLeft, bRight);
    const closestY = Phaser.Math.Clamp(py, bTop, bBot);
    const dx = px - closestX;
    const dy = py - closestY;
    return dx * dx + dy * dy < r * r;
  }

  private onHit(): void {
    this.lives--;
    this.livesText.setText(`❤ ${Math.max(0, this.lives)}`);

    if (this.lives <= 0) {
      this.die();
    } else {
      // Flash invincibility
      this.invincible = true;
      this.tweens.add({
        targets: this.player,
        alpha: 0.2,
        yoyo: true,
        repeat: 5,
        duration: 150,
        onComplete: () => {
          this.player.setAlpha(1);
          this.invincible = false;
        },
      });
    }
  }

  private die(): void {
    this.isAlive = false;
    this.spawnTimer.destroy();
    this.scoreTimer.destroy();

    // Death explosion
    this.cameras.main.shake(300, 0.015);
    this.player.setFillStyle(0xff0000);

    // Flash screen
    this.cameras.main.flash(200, 255, 50, 50);

    this.time.delayedCall(600, () => {
      this.engine.analytics.trackGameOver(this.score);
      this.scene.start('GameOverScene', { engine: this.engine, score: this.score });
    });
  }

  private checkScoreAchievements(): void {
    const acm = this.engine.achievements;
    if (this.score >= 100) acm.unlock('score_100');
    if (this.score >= 500) acm.unlock('score_500');
    if (this.score >= 1000) acm.unlock('score_1000');
    if (this.score >= 5000) acm.unlock('score_5000');
    if (this.difficulty >= 3) acm.unlock('diff_3');
    if (this.difficulty >= 5) acm.unlock('diff_5');
  }
}
