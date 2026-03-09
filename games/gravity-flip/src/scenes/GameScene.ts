import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_CONFIG, GRAVITY, RUN_SPEED, RUN_SPEED_INCREMENT,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_X,
  FLIP_COOLDOWN, GEM_SCORE, DISTANCE_SCORE_RATE,
  OBSTACLE_WIDTH, OBSTACLE_GAP, OBSTACLE_INTERVAL,
  PARALLAX_SPEEDS,
} from '../config';

interface Obstacle {
  top: Phaser.GameObjects.Rectangle;
  bottom: Phaser.GameObjects.Rectangle;
  x: number;
  passed: boolean;
}

interface Gem {
  circle: Phaser.GameObjects.Arc;
  x: number;
  y: number;
  collected: boolean;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;

  // Player
  private player!: Phaser.GameObjects.Rectangle;
  private playerVY = 0;
  private gravityDir = 1;  // 1 = down, -1 = up
  private playerY = 0;
  private lastFlipTime = 0;
  private isAlive = true;

  // World
  private worldSpeed = RUN_SPEED;
  private distance = 0;
  private score = 0;
  private scrollX = 0;

  // Obstacles
  private obstacles: Obstacle[] = [];
  private obstaclePairsPassed = 0;

  // Gems
  private gems: Gem[] = [];

  // Parallax layers
  private parallaxLayers: Phaser.GameObjects.Rectangle[][] = [];

  // UI
  private scoreText!: Phaser.GameObjects.Text;
  private distanceText!: Phaser.GameObjects.Text;
  private gemsText!: Phaser.GameObjects.Text;
  private gravityIndicator!: Phaser.GameObjects.Text;

  // Timers
  private obstacleTimer!: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { engine: GameEngine }): void {
    this.engine = data.engine;
    this.score = 0;
    this.distance = 0;
    this.scrollX = 0;
    this.isAlive = true;
    this.gravityDir = 1;
    this.playerVY = 0;
    this.worldSpeed = RUN_SPEED;
    this.obstacles = [];
    this.gems = [];
    this.obstaclePairsPassed = 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Background
    const sky = this.add.graphics();
    sky.fillGradientStyle(0x0d0d1a, 0x0d0d1a, 0x1a1a3e, 0x1a1a3e, 1);
    sky.fillRect(0, 0, width, height);

    // Stars (parallax layer 0 - slowest)
    const starLayer: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width * 2);
      const y = Phaser.Math.Between(0, height);
      const r = Math.random() < 0.8 ? 1 : 2;
      const star = this.add.rectangle(x, y, r * 2, r * 2, 0xffffff, 0.5);
      starLayer.push(star);
    }
    this.parallaxLayers.push(starLayer);

    // Mountain silhouettes (parallax layer 1)
    const mountainLayer: Phaser.GameObjects.Rectangle[] = [];
    for (let i = 0; i < 8; i++) {
      const mw = Phaser.Math.Between(60, 120);
      const mh = Phaser.Math.Between(60, 120);
      const mx = i * 160 + Phaser.Math.Between(-20, 20);
      const mt = this.add.rectangle(mx, height - mh / 2 - 30, mw, mh, 0x1e1e3a);
      mountainLayer.push(mt);
    }
    this.parallaxLayers.push(mountainLayer);

    // Ground and ceiling
    this.add.rectangle(width / 2, height - 15, width, 30, 0x2ec4b6).setDepth(8);
    this.add.rectangle(width / 2, 15, width, 30, 0xff9f1c).setDepth(8);

    // Player
    this.playerY = height / 2;
    this.player = this.add.rectangle(PLAYER_X, this.playerY, PLAYER_WIDTH, PLAYER_HEIGHT, 0xffffff);
    this.player.setDepth(10);

    // HUD
    this.scoreText = this.add.text(12, 44, '0', {
      fontFamily: theme.fontFamily,
      fontSize: '22px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setDepth(20);

    this.distanceText = this.add.text(12, 66, '0m', {
      fontFamily: theme.fontFamily,
      fontSize: '14px',
      color: '#888',
    }).setDepth(20);

    this.gemsText = this.add.text(width - 12, 44, '💎 0', {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: theme.primary,
    }).setOrigin(1, 0).setDepth(20);

    this.gravityIndicator = this.add.text(width / 2, 44, '↓', {
      fontFamily: theme.fontFamily,
      fontSize: '24px',
      color: theme.secondary,
    }).setOrigin(0.5, 0).setDepth(20);

    // Touch input to flip gravity
    this.input.on('pointerdown', () => this.flipGravity());

    // Spawn obstacles
    this.obstacleTimer = this.time.addEvent({
      delay: OBSTACLE_INTERVAL,
      callback: this.spawnObstacle,
      callbackScope: this,
      loop: true,
    });

    // Spawn a gem every 3 obstacles
    this.engine.analytics.trackGameStart();
  }

  private flipGravity(): void {
    if (!this.isAlive) return;
    const now = this.time.now;
    if (now - this.lastFlipTime < FLIP_COOLDOWN) return;
    this.lastFlipTime = now;
    this.gravityDir *= -1;
    this.playerVY = 0;
    this.gravityIndicator.setText(this.gravityDir === 1 ? '↓' : '↑');
    this.gravityIndicator.setColor(this.gravityDir === 1 ? '#2ec4b6' : '#ff9f1c');

    // Haptic
    if (navigator.vibrate) navigator.vibrate(15);
  }

  private spawnObstacle(): void {
    if (!this.isAlive) return;
    const { width, height } = this.scale;
    const gapCenterMin = 80 + OBSTACLE_GAP / 2;
    const gapCenterMax = height - 80 - OBSTACLE_GAP / 2;
    const gapCenter = Phaser.Math.Between(gapCenterMin, gapCenterMax);
    const x = width + OBSTACLE_WIDTH;

    const topH = gapCenter - OBSTACLE_GAP / 2 - 30;
    const botH = height - 30 - (gapCenter + OBSTACLE_GAP / 2);

    const topObs = this.add.rectangle(x, 30 + topH / 2, OBSTACLE_WIDTH, topH, 0xe71d36);
    topObs.setDepth(6);
    const botObs = this.add.rectangle(x, height - 30 - botH / 2, OBSTACLE_WIDTH, botH, 0xe71d36);
    botObs.setDepth(6);

    this.obstacles.push({ top: topObs, bottom: botObs, x, passed: false });

    // Spawn gem in gap
    if (this.obstaclePairsPassed % 3 === 0) {
      const gemY = gapCenter;
      const gem = this.add.circle(x + OBSTACLE_WIDTH + 30, gemY, 10, 0xffd700);
      gem.setDepth(7);
      this.gems.push({ circle: gem, x: x + OBSTACLE_WIDTH + 30, y: gemY, collected: false });
    }
  }

  update(_time: number, delta: number): void {
    if (!this.isAlive) return;
    const dt = delta / 1000;
    const { width, height } = this.scale;

    // Physics
    this.playerVY += GRAVITY * this.gravityDir * dt;
    this.playerVY = Phaser.Math.Clamp(this.playerVY, -600, 600);
    this.playerY += this.playerVY * dt;

    // Boundary collisions
    if (this.playerY <= 30 + PLAYER_HEIGHT / 2) {
      this.playerY = 30 + PLAYER_HEIGHT / 2;
      this.playerVY = 0;
    } else if (this.playerY >= height - 30 - PLAYER_HEIGHT / 2) {
      this.playerY = height - 30 - PLAYER_HEIGHT / 2;
      this.playerVY = 0;
    }

    this.player.y = this.playerY;
    this.player.rotation += dt * 2 * this.gravityDir;

    // Scroll world
    const scrollAmt = this.worldSpeed * dt;
    this.distance += scrollAmt;
    this.score += scrollAmt * DISTANCE_SCORE_RATE;
    this.scoreText.setText(String(Math.floor(this.score)));
    this.distanceText.setText(`${Math.floor(this.distance / 50)}m`);

    // Parallax
    this.parallaxLayers.forEach((layer, i) => {
      layer.forEach((obj) => {
        obj.x -= scrollAmt * PARALLAX_SPEEDS[i];
        if (obj.x < -100) obj.x += width + 200;
      });
    });

    // Move obstacles
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.top.x -= scrollAmt;
      obs.bottom.x -= scrollAmt;
      obs.x -= scrollAmt;

      // Collision check
      if (this.rectOverlaps(this.player, obs.top) || this.rectOverlaps(this.player, obs.bottom)) {
        this.die();
        return;
      }

      // Count passed
      if (!obs.passed && obs.x + OBSTACLE_WIDTH / 2 < PLAYER_X) {
        obs.passed = true;
        this.obstaclePairsPassed++;
        this.score += 100;
        this.checkAchievements();
      }

      // Cleanup off-screen
      if (obs.x < -OBSTACLE_WIDTH * 2) {
        obs.top.destroy();
        obs.bottom.destroy();
        this.obstacles.splice(i, 1);
      }
    }

    // Move gems
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      gem.circle.x -= scrollAmt;
      gem.x -= scrollAmt;

      if (!gem.collected && Phaser.Math.Distance.Between(PLAYER_X, this.playerY, gem.x, gem.y) < 20) {
        gem.collected = true;
        this.engine.currency.earn(1);
        this.gemsText.setText(`💎 ${this.engine.currency.getBalance()}`);
        this.score += GEM_SCORE;
        this.showFloatingText(`+${GEM_SCORE}`, gem.x, gem.y, '#ffd700');
        this.tweens.add({
          targets: gem.circle,
          scale: 2,
          alpha: 0,
          duration: 300,
          onComplete: () => gem.circle.destroy(),
        });
        this.gems.splice(i, 1);
      } else if (gem.x < -20) {
        gem.circle.destroy();
        this.gems.splice(i, 1);
      }
    }

    // Increase difficulty every 2000 units
    const milestone = Math.floor(this.distance / 2000);
    this.worldSpeed = RUN_SPEED + milestone * RUN_SPEED_INCREMENT;
  }

  private rectOverlaps(a: Phaser.GameObjects.Rectangle, b: Phaser.GameObjects.Rectangle): boolean {
    const aL = a.x - a.width / 2;
    const aR = a.x + a.width / 2;
    const aT = a.y - a.height / 2;
    const aB = a.y + a.height / 2;
    const bL = b.x - b.width / 2;
    const bR = b.x + b.width / 2;
    const bT = b.y - b.height / 2;
    const bB = b.y + b.height / 2;
    return aL < bR && aR > bL && aT < bB && aB > bT;
  }

  private showFloatingText(text: string, x: number, y: number, color: string): void {
    const t = this.add.text(x, y, text, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '18px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(25);
    this.tweens.add({
      targets: t,
      y: y - 50,
      alpha: 0,
      duration: 600,
      onComplete: () => t.destroy(),
    });
  }

  private checkAchievements(): void {
    const acm = this.engine.achievements;
    const d = Math.floor(this.distance / 50);
    if (d >= 100) acm.unlock('dist_100');
    if (d >= 500) acm.unlock('dist_500');
    if (d >= 1000) acm.unlock('dist_1000');
    if (this.obstaclePairsPassed >= 10) acm.unlock('pass_10');
    if (this.obstaclePairsPassed >= 50) acm.unlock('pass_50');
  }

  private die(): void {
    this.isAlive = false;
    this.obstacleTimer.destroy();
    this.cameras.main.shake(250, 0.018);
    this.player.setFillStyle(0xff4444);
    this.time.delayedCall(700, () => {
      const finalScore = Math.floor(this.score);
      const finalDist = Math.floor(this.distance / 50);
      this.engine.analytics.trackGameOver(finalScore);
      this.scene.start('GameOverScene', {
        engine: this.engine,
        score: finalScore,
        distance: finalDist,
        gems: this.engine.currency.getBalance(),
      });
    });
  }
}
