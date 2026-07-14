import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_WIDTH, GAME_HEIGHT, GAME_CONFIG,
  FLIGHT_SPEED, LATCH_TOLERANCE, PERFECT_TOLERANCE, OFFSCREEN_MARGIN,
  PLANET_RADIUS_MIN, PLANET_RADIUS_MAX, PLANET_COLOR_A, PLANET_COLOR_B,
  SPAWN_DIST_MIN, SPAWN_DIST_MAX, MIN_PLANET_SEPARATION,
  RING_RADIUS_BASE, RING_RADIUS_DECAY, RING_RADIUS_MIN, RING_RADIUS_MAX,
  ORBIT_SPEED_BASE, ORBIT_SPEED_INCREMENT, ORBIT_SPEED_MIN, ORBIT_SPEED_MAX,
  DRIFT_START_HOP, DRIFT_SPEED_MIN, DRIFT_SPEED_MAX,
  SCORE_PER_HOP, COINS_PER_PERFECT, XP_PER_HOP, COMBO_MAX_BONUS_MULTIPLIER,
} from '../config';

interface Planet {
  gfx: Phaser.GameObjects.Arc;
  ring: Phaser.GameObjects.Arc;
  glow: Phaser.GameObjects.Arc;
  radius: number;
  ringRadius: number;
  orbitSpeed: number; // deg/s
  orbitDir: 1 | -1;
  driftVX: number;
  driftVY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

type SparkState = 'orbiting' | 'flying';

interface GameSceneInitData {
  engine?: GameEngine;
  resumeScore?: number;
  resumeHops?: number;
  rescued?: boolean;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;

  private spark!: Phaser.GameObjects.Arc;
  private sparkGlow1!: Phaser.GameObjects.Arc;
  private sparkGlow2!: Phaser.GameObjects.Arc;
  private sparkState: SparkState = 'orbiting';
  private angle = 0; // radians, current orbit angle (also entry angle when latching)
  private sparkVX = 0;
  private sparkVY = 0;

  private current!: Planet;
  private ahead: Planet[] = [];
  private planetColorToggle = 0;

  private score = 0;
  private hopCount = 0;
  private combo = 0;
  private perfectsThisRun = 0;
  private rescued = false;

  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;

  private isAlive = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: GameSceneInitData): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
    this.score = data.resumeScore ?? 0;
    this.hopCount = data.resumeHops ?? 0;
    this.rescued = data.rescued === true;
    this.combo = 0;
    this.perfectsThisRun = 0;
    this.ahead = [];
    this.planetColorToggle = 0;
    this.sparkState = 'orbiting';
    this.angle = 0;
    this.sparkVX = 0;
    this.sparkVY = 0;
    this.isAlive = true;
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x0a0e1a);
    this.createStars();

    // Initial (current) planet
    this.current = this.spawnPlanetAt(
      Phaser.Math.Clamp(width / 2, 0, width),
      Phaser.Math.Clamp(height * 0.35, 0, height),
      this.hopCount,
    );

    // Two planets ahead
    this.ahead.push(this.spawnPlanet(this.current, this.hopCount));
    this.ahead.push(this.spawnPlanet(this.ahead[0], this.hopCount));

    // Spark
    const startX = this.current.gfx.x + this.current.ringRadius;
    const startY = this.current.gfx.y;
    this.spark = this.add.circle(startX, startY, 7, 0xffffff).setDepth(10);
    this.sparkGlow1 = this.add.circle(startX, startY, 12, 0xffffff, 0.18).setDepth(9);
    this.sparkGlow2 = this.add.circle(startX, startY, 18, 0xffffff, 0.08).setDepth(8);
    this.tweens.add({
      targets: [this.sparkGlow1, this.sparkGlow2],
      alpha: { from: 0.18, to: 0.05 },
      yoyo: true,
      repeat: -1,
      duration: 700,
    });

    // HUD
    this.scoreText = this.add
      .text(12, 12, `${this.score}`, {
        fontFamily: theme.fontFamily,
        fontSize: '20px',
        color: theme.primary,
      })
      .setDepth(20);

    this.comboText = this.add
      .text(width / 2, 12, '', {
        fontFamily: theme.fontFamily,
        fontSize: '18px',
        color: theme.accent,
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.coinsText = this.add
      .text(width - 12, 12, `💎 ${this.engine.currency.getBalance()}`, {
        fontFamily: theme.fontFamily,
        fontSize: '16px',
        color: theme.secondary,
      })
      .setOrigin(1, 0)
      .setDepth(20);

    // Input: tap anywhere to detach
    this.input.on('pointerdown', () => this.onTap());

    this.engine.analytics.trackGameStart();
  }

  private createStars(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 40; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const r = Phaser.Math.FloatBetween(0.4, 1.4);
      const alpha = Phaser.Math.FloatBetween(0.15, 0.6);
      this.add.circle(x, y, r, 0xffffff, alpha).setDepth(0);
    }
  }

  private computeDifficulty(n: number): { ringRadius: number; orbitSpeed: number; orbitDir: 1 | -1 } {
    const ringRadius = Phaser.Math.Clamp(
      RING_RADIUS_BASE - n * RING_RADIUS_DECAY,
      RING_RADIUS_MIN,
      RING_RADIUS_MAX,
    );
    const orbitSpeed = Phaser.Math.Clamp(
      ORBIT_SPEED_BASE + n * ORBIT_SPEED_INCREMENT,
      ORBIT_SPEED_MIN,
      ORBIT_SPEED_MAX,
    );
    const orbitDir: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
    return { ringRadius, orbitSpeed, orbitDir };
  }

  private spawnPlanetAt(x: number, y: number, n: number): Planet {
    const { ringRadius, orbitSpeed, orbitDir } = this.computeDifficulty(n);
    const radius = Phaser.Math.Between(PLANET_RADIUS_MIN, PLANET_RADIUS_MAX);
    const color = this.planetColorToggle % 2 === 0 ? PLANET_COLOR_A : PLANET_COLOR_B;
    this.planetColorToggle++;

    const minX = ringRadius + 20;
    const maxX = GAME_WIDTH - ringRadius - 20;
    const minY = ringRadius + 80;
    const maxY = GAME_HEIGHT - ringRadius - 80;
    const cx = Phaser.Math.Clamp(x, minX, maxX);
    const cy = Phaser.Math.Clamp(y, minY, maxY);

    let driftVX = 0;
    let driftVY = 0;
    if (n >= DRIFT_START_HOP) {
      const dAngle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dSpeed = Phaser.Math.FloatBetween(DRIFT_SPEED_MIN, DRIFT_SPEED_MAX);
      driftVX = Math.cos(dAngle) * dSpeed;
      driftVY = Math.sin(dAngle) * dSpeed;
    }

    const gfx = this.add.circle(cx, cy, radius, color).setDepth(5);
    const ring = this.add.circle(cx, cy, ringRadius).setStrokeStyle(2, color, 0.5).setDepth(4);
    const glow = this.add.circle(cx, cy, radius + 6, color, 0.15).setDepth(3);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.15, to: 0.05 },
      yoyo: true,
      repeat: -1,
      duration: 1200,
    });

    return { gfx, ring, glow, radius, ringRadius, orbitSpeed, orbitDir, driftVX, driftVY, minX, maxX, minY, maxY };
  }

  /** Spawns a new planet "onward" from `basePlanet`, respecting spacing rules. */
  private spawnPlanet(basePlanet: Planet, n: number): Planet {
    const { ringRadius } = this.computeDifficulty(n);
    const minX = ringRadius + 20;
    const maxX = GAME_WIDTH - ringRadius - 20;
    const minY = ringRadius + 80;
    const maxY = GAME_HEIGHT - ringRadius - 80;

    const others = this.allAlivePlanets();
    let bestX = basePlanet.gfx.x;
    let bestY = basePlanet.gfx.y;

    for (let attempt = 0; attempt < 30; attempt++) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(SPAWN_DIST_MIN, SPAWN_DIST_MAX);
      const x = Phaser.Math.Clamp(basePlanet.gfx.x + Math.cos(angle) * dist, minX, maxX);
      const y = Phaser.Math.Clamp(basePlanet.gfx.y + Math.sin(angle) * dist, minY, maxY);

      const farEnough = others.every(
        (p) => Phaser.Math.Distance.Between(x, y, p.gfx.x, p.gfx.y) >= MIN_PLANET_SEPARATION,
      );

      bestX = x;
      bestY = y;
      if (farEnough) break;
    }

    return this.spawnPlanetAt(bestX, bestY, n);
  }

  private allAlivePlanets(): Planet[] {
    return this.current ? [this.current, ...this.ahead] : [...this.ahead];
  }

  private onTap(): void {
    if (!this.isAlive || this.sparkState !== 'orbiting') return;
    const planet = this.current;
    const dirSign = planet.orbitDir;
    const tx = -Math.sin(this.angle) * dirSign;
    const ty = Math.cos(this.angle) * dirSign;
    this.sparkVX = tx * FLIGHT_SPEED;
    this.sparkVY = ty * FLIGHT_SPEED;
    this.sparkState = 'flying';
  }

  update(_time: number, delta: number): void {
    if (!this.isAlive) return;
    const dt = delta / 1000;

    // Drift alive planets
    for (const p of this.allAlivePlanets()) {
      if (p.driftVX === 0 && p.driftVY === 0) continue;
      let nx = p.gfx.x + p.driftVX * dt;
      let ny = p.gfx.y + p.driftVY * dt;
      if (nx < p.minX) { nx = p.minX; p.driftVX *= -1; } else if (nx > p.maxX) { nx = p.maxX; p.driftVX *= -1; }
      if (ny < p.minY) { ny = p.minY; p.driftVY *= -1; } else if (ny > p.maxY) { ny = p.maxY; p.driftVY *= -1; }
      p.gfx.setPosition(nx, ny);
      p.ring.setPosition(nx, ny);
      p.glow.setPosition(nx, ny);
    }

    if (this.sparkState === 'orbiting') {
      const planet = this.current;
      this.angle += planet.orbitDir * planet.orbitSpeed * (Math.PI / 180) * dt;
      const sx = planet.gfx.x + Math.cos(this.angle) * planet.ringRadius;
      const sy = planet.gfx.y + Math.sin(this.angle) * planet.ringRadius;
      this.updateSparkPosition(sx, sy);
    } else {
      const nx = this.spark.x + this.sparkVX * dt;
      const ny = this.spark.y + this.sparkVY * dt;
      this.updateSparkPosition(nx, ny);

      if (nx < -OFFSCREEN_MARGIN || nx > GAME_WIDTH + OFFSCREEN_MARGIN
        || ny < -OFFSCREEN_MARGIN || ny > GAME_HEIGHT + OFFSCREEN_MARGIN) {
        this.die();
        return;
      }

      for (const p of this.ahead) {
        const d = Phaser.Math.Distance.Between(nx, ny, p.gfx.x, p.gfx.y);
        if (d >= p.ringRadius - LATCH_TOLERANCE && d <= p.ringRadius + LATCH_TOLERANCE) {
          this.handleLatch(p, d);
          break;
        }
      }
    }
  }

  private updateSparkPosition(x: number, y: number): void {
    this.spark.setPosition(x, y);
    this.sparkGlow1.setPosition(x, y);
    this.sparkGlow2.setPosition(x, y);
  }

  private handleLatch(planet: Planet, distance: number): void {
    const perfect = Math.abs(distance - planet.ringRadius) <= PERFECT_TOLERANCE;
    const entryAngle = Math.atan2(this.spark.y - planet.gfx.y, this.spark.x - planet.gfx.x);
    this.angle = entryAngle;
    this.updateSparkPosition(
      planet.gfx.x + Math.cos(entryAngle) * planet.ringRadius,
      planet.gfx.y + Math.sin(entryAngle) * planet.ringRadius,
    );
    this.sparkState = 'orbiting';

    // Fade out and destroy the planet we just left
    this.fadeAndDestroyPlanet(this.current);

    // Promote the latched planet to current
    this.ahead = this.ahead.filter((p) => p !== planet);
    this.current = planet;

    this.hopCount++;
    this.score += SCORE_PER_HOP;

    if (perfect) {
      this.combo++;
      this.score += SCORE_PER_HOP * Math.min(this.combo, COMBO_MAX_BONUS_MULTIPLIER);
      this.engine.currency.earn(COINS_PER_PERFECT);
      this.perfectsThisRun++;
      this.showFloatingText(planet.gfx.x, planet.gfx.y - planet.radius - 30, 'PERFECT', GAME_CONFIG.theme.accent);
    } else {
      this.combo = 0;
    }

    this.updateHUD();

    const xpResult = this.engine.xp.addXP(XP_PER_HOP);
    if (xpResult.leveledUp) {
      this.showFloatingText(this.scale.width / 2, this.scale.height / 2, 'LEVEL UP!', GAME_CONFIG.theme.secondary);
    }

    this.checkAchievements();

    // Replenish ahead planets back up to 2
    while (this.ahead.length < 2) {
      const base = this.ahead.length > 0 ? this.ahead[this.ahead.length - 1] : this.current;
      this.ahead.push(this.spawnPlanet(base, this.hopCount));
    }
  }

  private fadeAndDestroyPlanet(planet: Planet): void {
    this.tweens.killTweensOf(planet.glow);
    this.tweens.add({
      targets: [planet.gfx, planet.ring, planet.glow],
      alpha: 0,
      duration: 300,
      onComplete: () => {
        planet.gfx.destroy();
        planet.ring.destroy();
        planet.glow.destroy();
      },
    });
  }

  private updateHUD(): void {
    this.scoreText.setText(`${this.score}`);
    this.comboText.setText(this.combo >= 2 ? `x${this.combo} 🔥` : '');
    this.coinsText.setText(`💎 ${this.engine.currency.getBalance()}`);
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const label = this.add
      .text(x, y, text, {
        fontFamily: GAME_CONFIG.theme.fontFamily,
        fontSize: '20px',
        color,
      })
      .setOrigin(0.5)
      .setDepth(25);

    this.tweens.add({
      targets: label,
      y: y - 50,
      alpha: 0,
      duration: 900,
      ease: 'Power2',
      onComplete: () => label.destroy(),
    });
  }

  private checkAchievements(): void {
    const acm = this.engine.achievements;
    if (this.hopCount >= 10) acm.unlock('hops_10');
    if (this.hopCount >= 25) acm.unlock('hops_25');
    if (this.hopCount >= 50) acm.unlock('hops_50');
    if (this.perfectsThisRun >= 5) acm.unlock('perfect_5');
    if (this.perfectsThisRun >= 15) acm.unlock('perfect_15');
    if (this.combo >= 5) acm.unlock('combo_x5');
  }

  private die(): void {
    this.isAlive = false;

    this.cameras.main.shake(250, 0.015);
    this.spark.setFillStyle(0xff3355);
    this.sparkGlow1.setFillStyle(0xff3355);
    this.sparkGlow2.setFillStyle(0xff3355);

    this.time.delayedCall(600, () => {
      this.engine.analytics.trackGameOver(this.score);
      this.scene.start('GameOverScene', { engine: this.engine, score: this.score, hops: this.hopCount, rescued: this.rescued });
    });
  }
}
