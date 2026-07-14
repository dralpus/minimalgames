import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_CONFIG,
  WHEEL_RADIUS, WHEEL_CENTER_X, WHEEL_CENTER_Y,
  WAITING_PIN_X, WAITING_PIN_Y,
  PIN_WIDTH, PIN_LENGTH, PIN_HEAD_RADIUS, PIN_SPEED,
  MIN_PIN_GAP, GOLD_STUD_HIT_GAP, GOLD_STUD_PLACEMENT_GAP,
  getLevelDef, getGoldStudCount,
  SCORE_PER_STUCK_PIN, SCORE_PER_LEVEL_CLEAR,
  XP_PER_STUCK_PIN, XP_PER_LEVEL_CLEAR, GOLD_PER_STUD,
  type RotationPattern,
} from '../config';

/** In-memory fail streak — resets on full page reload, not persisted */
let failStreak = 0;

interface StuckPin {
  angle: number;
  container: Phaser.GameObjects.Container;
}

interface GoldStud {
  angle: number;
  arc: Phaser.GameObjects.Arc;
}

function normalizeAngle(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function angleDiff(a: number, b: number): number {
  const d = Math.abs(normalizeAngle(a) - normalizeAngle(b)) % 360;
  return d > 180 ? 360 - d : d;
}

function angularVelocity(pattern: RotationPattern, base: number, t: number): number {
  if (pattern === 'constant') {
    return base;
  }
  if (pattern === 'pulse') {
    return base * (0.35 + 0.65 * Math.abs(Math.sin(t * 1.6)));
  }
  if (pattern === 'reverse') {
    const s = Math.sin(t * 0.9);
    return base * (s >= 0 ? 1 : -1);
  }
  // stutter: 1.1s at base, 0.45s at 0, repeating — driven by elapsed time modulo
  const phase = t % 1.55;
  return phase < 1.1 ? base : 0;
}

function generateAngles(count: number, minGap: number, avoid: number[] = []): number[] {
  const angles: number[] = [];
  let attempts = 0;
  while (angles.length < count && attempts < 800) {
    attempts++;
    const candidate = Math.random() * 360;
    const all = [...avoid, ...angles];
    if (all.every((a) => angleDiff(a, candidate) >= minGap)) {
      angles.push(candidate);
    }
  }
  return angles;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;

  private level = 1;
  private runScore = 0;
  private clearStreak = 0;
  private pendingRemoveTwo = false;

  private wheelRotation = 0;
  private patternClock = 0;
  private base = 36;
  private pattern: RotationPattern = 'constant';

  private stuckPins: StuckPin[] = [];
  private goldStuds: GoldStud[] = [];
  private wheelGfx!: Phaser.GameObjects.Graphics;
  private wheelMarks!: Phaser.GameObjects.Graphics;

  private waitingPin: Phaser.GameObjects.Container | null = null;
  private flyingPin: Phaser.GameObjects.Container | null = null;

  private pinsToThrow = 0;
  private pinsStuckByPlayer = 0;
  private pinsRemaining = 0;
  private dots: Phaser.GameObjects.Arc[] = [];

  private levelText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private coinsText!: Phaser.GameObjects.Text;

  private isTransitioning = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { engine: GameEngine; removeTwo?: boolean }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');
    this.level = this.engine.storage.get<number>('level', 1);
    this.runScore = 0;
    this.clearStreak = 0;
    this.pendingRemoveTwo = data.removeTwo ?? false;
    this.wheelRotation = 0;
    this.stuckPins = [];
    this.goldStuds = [];
    this.waitingPin = null;
    this.flyingPin = null;
    this.isTransitioning = false;
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x12141c);
    this.createGrid();

    this.scoreText = this.add.text(12, 12, 'SCORE: 0', {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '16px',
      color: GAME_CONFIG.theme.primary,
    }).setDepth(20);

    this.coinsText = this.add.text(width - 12, 12, `💰 ${this.engine.currency.getBalance()}`, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '16px',
      color: GAME_CONFIG.theme.accent,
    }).setDepth(20).setOrigin(1, 0);

    this.levelText = this.add.text(width / 2, 12, `LEVEL ${this.level}`, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '18px',
      color: '#ffffff',
    }).setDepth(20).setOrigin(0.5, 0);

    this.wheelGfx = this.add.graphics();
    this.wheelMarks = this.add.graphics();

    this.input.on('pointerdown', () => this.tryThrow());

    this.engine.analytics.trackGameStart();

    this.startLevel(this.level);
  }

  private createGrid(): void {
    const { width, height } = this.scale;
    const gfx = this.add.graphics();
    gfx.lineStyle(1, 0x1a1d29, 0.5);
    const step = 40;
    for (let x = 0; x <= width; x += step) gfx.lineBetween(x, 0, x, height);
    for (let y = 0; y <= height; y += step) gfx.lineBetween(0, y, width, y);
  }

  private startLevel(level: number): void {
    this.level = level;
    this.levelText.setText(`LEVEL ${this.level}`);
    this.checkLevelAchievements(this.level);

    const def = getLevelDef(level);
    this.base = def.rpm * 6;
    this.pattern = def.pattern;
    this.patternClock = 0;

    // Reset transforms left over from the level-clear shatter tween
    this.wheelGfx.setAlpha(1).setScale(1).setAngle(0);
    this.wheelMarks.setAlpha(1).setScale(1).setAngle(0);

    // Wheel base graphics
    this.wheelGfx.clear();
    this.wheelGfx.fillStyle(0x1e2230, 1);
    this.wheelGfx.fillCircle(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS);
    this.wheelGfx.lineStyle(3, 0x00b4ff, 1);
    this.wheelGfx.strokeCircle(WHEEL_CENTER_X, WHEEL_CENTER_Y, WHEEL_RADIUS);
    this.wheelGfx.fillStyle(0x00b4ff, 1);
    this.wheelGfx.fillCircle(WHEEL_CENTER_X, WHEEL_CENTER_Y, 8);

    // Preplaced pins
    this.stuckPins.forEach((p) => p.container.destroy());
    let preplacedAngles = generateAngles(def.preplaced, MIN_PIN_GAP);
    if (this.pendingRemoveTwo) {
      for (let i = 0; i < 2 && preplacedAngles.length > 0; i++) {
        const idx = Phaser.Math.Between(0, preplacedAngles.length - 1);
        preplacedAngles.splice(idx, 1);
      }
      this.pendingRemoveTwo = false;
    }
    this.stuckPins = preplacedAngles.map((angle) => ({
      angle,
      container: this.createPinObject(),
    }));

    // Gold studs
    this.goldStuds.forEach((s) => s.arc.destroy());
    const studCount = getGoldStudCount(level);
    const studAngles = generateAngles(studCount, GOLD_STUD_PLACEMENT_GAP, preplacedAngles);
    this.goldStuds = studAngles.map((angle) => ({
      angle,
      arc: this.add.circle(0, 0, 7, 0xffd700).setDepth(9),
    }));

    // Pins-remaining dots
    this.dots.forEach((d) => d.destroy());
    this.dots = [];
    this.pinsToThrow = def.pins;
    this.pinsStuckByPlayer = 0;
    this.pinsRemaining = def.pins;
    for (let i = 0; i < def.pins; i++) {
      const dot = this.add.circle(16, 100 + i * 20, 4, 0xff6b35).setDepth(20);
      this.dots.push(dot);
    }

    this.waitingPin?.destroy();
    this.flyingPin?.destroy();
    this.flyingPin = null;
    this.waitingPin = this.spawnWaitingPin();

    this.repositionWheelObjects();
  }

  private createPinObject(): Phaser.GameObjects.Container {
    const container = this.add.container(0, 0);
    const body = this.add.rectangle(0, PIN_LENGTH / 2, PIN_WIDTH, PIN_LENGTH, 0xff6b35);
    const head = this.add.circle(0, PIN_LENGTH, PIN_HEAD_RADIUS, 0xff6b35);
    container.add([body, head]);
    container.setDepth(8);
    return container;
  }

  private spawnWaitingPin(): Phaser.GameObjects.Container {
    const container = this.createPinObject();
    container.setPosition(WAITING_PIN_X, WAITING_PIN_Y - PIN_LENGTH);
    container.setRotation(0);
    container.setDepth(15);
    return container;
  }

  private tryThrow(): void {
    if (this.isTransitioning) return;
    if (this.flyingPin) return;
    if (!this.waitingPin) return;

    this.flyingPin = this.waitingPin;
    this.waitingPin = null;

    this.pinsRemaining = Math.max(0, this.pinsRemaining - 1);
    const dot = this.dots.pop();
    dot?.destroy();

    if (this.pinsRemaining > 0) {
      this.waitingPin = this.spawnWaitingPin();
    }
  }

  update(_time: number, delta: number): void {
    if (this.isTransitioning) return;
    const dt = delta / 1000;

    this.patternClock += dt;
    const omega = angularVelocity(this.pattern, this.base, this.patternClock);
    this.wheelRotation = normalizeAngle(this.wheelRotation + omega * dt);

    this.repositionWheelObjects();
    this.drawWheelMarks();

    if (this.flyingPin) {
      this.flyingPin.y -= PIN_SPEED * dt;
      if (this.flyingPin.y <= WHEEL_CENTER_Y + WHEEL_RADIUS) {
        this.resolveImpact();
      }
    }
  }

  private repositionWheelObjects(): void {
    for (const pin of this.stuckPins) {
      const rad = Phaser.Math.DegToRad(pin.angle + this.wheelRotation);
      const tx = WHEEL_CENTER_X + Math.cos(rad) * WHEEL_RADIUS;
      const ty = WHEEL_CENTER_Y + Math.sin(rad) * WHEEL_RADIUS;
      pin.container.setPosition(tx, ty);
      pin.container.setRotation(rad - Math.PI / 2);
    }
    for (const stud of this.goldStuds) {
      const rad = Phaser.Math.DegToRad(stud.angle + this.wheelRotation);
      stud.arc.setPosition(
        WHEEL_CENTER_X + Math.cos(rad) * WHEEL_RADIUS,
        WHEEL_CENTER_Y + Math.sin(rad) * WHEEL_RADIUS,
      );
    }
  }

  private drawWheelMarks(): void {
    this.wheelMarks.clear();
    this.wheelMarks.lineStyle(2, 0x2a2f42, 1);
    for (let i = 0; i < 4; i++) {
      const rad = Phaser.Math.DegToRad(i * 90 + this.wheelRotation);
      const x1 = WHEEL_CENTER_X + Math.cos(rad) * 16;
      const y1 = WHEEL_CENTER_Y + Math.sin(rad) * 16;
      const x2 = WHEEL_CENTER_X + Math.cos(rad) * (WHEEL_RADIUS - 6);
      const y2 = WHEEL_CENTER_Y + Math.sin(rad) * (WHEEL_RADIUS - 6);
      this.wheelMarks.lineBetween(x1, y1, x2, y2);
    }
  }

  private resolveImpact(): void {
    const pin = this.flyingPin;
    if (!pin) return;

    const contactRad = Math.atan2(WHEEL_CENTER_Y + WHEEL_RADIUS - WHEEL_CENTER_Y, pin.x - WHEEL_CENTER_X);
    const contactDeg = Phaser.Math.RadToDeg(contactRad);
    const stuckAngle = normalizeAngle(contactDeg - this.wheelRotation);

    const collides = this.stuckPins.some((p) => angleDiff(p.angle, stuckAngle) < MIN_PIN_GAP);
    if (collides) {
      this.failRun();
      return;
    }

    const studIdx = this.goldStuds.findIndex((s) => angleDiff(s.angle, stuckAngle) < GOLD_STUD_HIT_GAP);
    if (studIdx !== -1) {
      this.collectGold(studIdx);
    }

    this.stickPin(pin, stuckAngle);
  }

  private stickPin(pin: Phaser.GameObjects.Container, angle: number): void {
    this.flyingPin = null;
    this.stuckPins.push({ angle, container: pin });
    this.pinsStuckByPlayer++;

    this.runScore += SCORE_PER_STUCK_PIN;
    this.scoreText.setText(`SCORE: ${this.runScore}`);
    this.engine.xp.addXP(XP_PER_STUCK_PIN);

    this.repositionWheelObjects();

    if (this.pinsStuckByPlayer >= this.pinsToThrow) {
      this.levelClear();
    }
  }

  private collectGold(idx: number): void {
    const stud = this.goldStuds[idx];
    stud.arc.destroy();
    this.goldStuds.splice(idx, 1);

    this.engine.currency.earn(GOLD_PER_STUD);
    this.coinsText.setText(`💰 ${this.engine.currency.getBalance()}`);

    const lifetime = this.engine.storage.get<number>('goldStudsLifetime', 0) + 1;
    this.engine.storage.set('goldStudsLifetime', lifetime);
    if (lifetime >= 10) {
      this.engine.achievements.unlock('gold_10');
    }

    const { width } = this.scale;
    const floatText = this.add.text(width / 2, WHEEL_CENTER_Y, '+5 💰', {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '20px',
      color: '#ffd700',
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: floatText,
      y: WHEEL_CENTER_Y - 60,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => floatText.destroy(),
    });
  }

  private levelClear(): void {
    this.isTransitioning = true;
    this.runScore += SCORE_PER_LEVEL_CLEAR;
    this.scoreText.setText(`SCORE: ${this.runScore}`);
    this.clearStreak++;
    if (this.clearStreak >= 3) {
      this.engine.achievements.unlock('no_miss_3');
    }
    this.engine.xp.addXP(XP_PER_LEVEL_CLEAR);

    // Graphics objects transform from the canvas origin, not the wheel
    // center, so they only fade; pins/studs scale from their own centers.
    this.tweens.add({
      targets: [this.wheelGfx, this.wheelMarks],
      alpha: 0,
      duration: 900,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: [
        ...this.stuckPins.map((p) => p.container),
        ...this.goldStuds.map((s) => s.arc),
      ],
      scaleX: 1.6,
      scaleY: 1.6,
      alpha: 0,
      angle: Phaser.Math.Between(-30, 30),
      duration: 900,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        const nextLevel = this.level + 1;
        this.engine.storage.set('level', nextLevel);
        this.isTransitioning = false;
        this.startLevel(nextLevel);
      },
    });
  }

  private failRun(): void {
    this.isTransitioning = true;
    failStreak++;
    const showAd = failStreak % 4 === 0;
    const pinsOnWheelAtFail = this.stuckPins.length;
    const pin = this.flyingPin;

    this.cameras.main.shake(300, 0.015);

    if (pin) {
      this.tweens.add({
        targets: pin,
        x: pin.x + 150,
        y: pin.y + 150,
        rotation: pin.rotation + 6,
        alpha: 0,
        duration: 600,
        ease: 'Power2',
      });
    }

    this.engine.analytics.trackGameOver(this.runScore);

    this.time.delayedCall(700, async () => {
      await this.engine.leaderboard.submitScore(this.level);
      this.scene.start('GameOverScene', {
        engine: this.engine,
        level: this.level,
        runScore: this.runScore,
        pinsOnWheelAtFail,
        showAd,
      });
    });
  }

  private checkLevelAchievements(level: number): void {
    if (level >= 5) this.engine.achievements.unlock('level_5');
    if (level >= 10) this.engine.achievements.unlock('level_10');
    if (level >= 20) this.engine.achievements.unlock('level_20');
  }
}
