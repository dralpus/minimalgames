import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_WIDTH, GAME_HEIGHT, GAME_CONFIG, COLORS,
  ORB_RADIUS, ORB_X, GRAVITY, JUMP_VY, TERMINAL_VY,
  START_Y, OBSTACLE_GAP_Y,
  RING_RADIUS, RING_THICKNESS,
  BAR_HEIGHT, BAR_SEGMENT_WIDTH, BAR_WRAP,
  PICKUP_SIZE, PICKUP_OFFSET_Y, PICKUP_RADIUS,
  STAR_RADIUS, STAR_OFFSET_Y,
  HEIGHT_PER_METER,
} from '../config';

type ObstacleType = 'ring' | 'bar' | 'cross';

interface Obstacle {
  worldY: number;
  type: ObstacleType;
  index: number;
  passed: boolean;
  nearMissCounted: boolean;
  gfx: Phaser.GameObjects.Graphics;
  // ring / cross-as-ring
  radius: number;
  thickness: number;
  rotationDeg: number;
  rotSpeed: number;
  direction: number;
  // bar
  barOffset: number;
  barSpeed: number;
}

interface Pickup {
  worldY: number;
  x: number;
  consumed: boolean;
  obj: Phaser.GameObjects.Rectangle;
}

interface StarItem {
  worldY: number;
  x: number;
  consumed: boolean;
  obj: Phaser.GameObjects.Arc;
}

/** Returns true if the closed ranges [aLo,aHi] and [bLo,bHi] overlap. */
function rangesOverlap(aLo: number, aHi: number, bLo: number, bHi: number): boolean {
  return aLo <= bHi && bLo <= aHi;
}

function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;

  // Orb state
  private orbWorldY = START_Y;
  private prevOrbWorldY = START_Y;
  private orbVY = 0;
  private orbColorIndex = 0;
  private orb!: Phaser.GameObjects.Arc;
  private orbGlow!: Phaser.GameObjects.Arc;

  // Camera
  private cameraY = START_Y - 420;

  // World state
  private minWorldYReached = START_Y;
  private obstacles: Obstacle[] = [];
  private pickups: Pickup[] = [];
  private stars: StarItem[] = [];
  private nextObstacleIndex = 0;
  private passedCount = 0;
  private starCount = 0;
  private nearMissCount = 0;

  private isAlive = true;
  private revived = false;
  private invulnerableMs = 0;

  // HUD
  private heightText!: Phaser.GameObjects.Text;
  private starText!: Phaser.GameObjects.Text;
  private bestLine!: Phaser.GameObjects.Graphics;
  private bestLabel!: Phaser.GameObjects.Text;
  private bestHeightMeters = 0;

  private bgDots: Phaser.GameObjects.Arc[] = [];

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { engine?: GameEngine; resumeHeight?: number; revived?: boolean }): void {
    this.engine = data.engine ?? this.game.registry.get('engine');

    this.isAlive = true;
    this.revived = data.revived === true;
    this.invulnerableMs = this.revived ? 1200 : 0;

    this.orbVY = 0;
    this.orbColorIndex = Phaser.Math.Between(0, COLORS.length - 1);

    this.obstacles = [];
    this.pickups = [];
    this.stars = [];
    this.nextObstacleIndex = 0;
    this.passedCount = 0;
    this.starCount = 0;
    this.nearMissCount = 0;
    this.bgDots = [];

    if (data.resumeHeight && data.resumeHeight > 0) {
      const resumeWorldY = START_Y - data.resumeHeight * HEIGHT_PER_METER;
      this.minWorldYReached = resumeWorldY;
      this.orbWorldY = this.findSafeSpawnY(resumeWorldY);
    } else {
      this.minWorldYReached = START_Y;
      this.orbWorldY = START_Y;
    }
    this.prevOrbWorldY = this.orbWorldY;
    this.cameraY = this.orbWorldY - 420;

    this.bestHeightMeters = this.engine.storage.get<number>('bestHeight', 0);
  }

  /**
   * Obstacles live at deterministic world-Y positions (-200 - i*OBSTACLE_GAP_Y),
   * independent of run state. With a 320px gap, no point can be a full 200px from
   * BOTH neighbors (max distance to nearest neighbor is 160px), so we settle for
   * the safest achievable point — the midpoint between the two obstacles that
   * bracket the target — plus a short post-revive invulnerability window.
   */
  private findSafeSpawnY(target: number): number {
    let y = target;
    for (let guard = 0; guard < 10; guard++) {
      const nearestIdx = Math.round((-200 - y) / OBSTACLE_GAP_Y);
      const nearestY = -200 - nearestIdx * OBSTACLE_GAP_Y;
      const dist = Math.abs(y - nearestY);
      const desired = OBSTACLE_GAP_Y / 2; // best achievable clearance
      if (dist >= desired - 1) break;
      y += y <= nearestY ? -(desired - dist) : (desired - dist);
    }
    return y;
  }

  create(): void {
    const { width, height } = this.scale;

    this.add.rectangle(width / 2, height / 2, width, height, 0x16121f);
    this.createBackgroundDots();

    this.orbGlow = this.add.circle(ORB_X, 0, ORB_RADIUS + 8, COLORS[this.orbColorIndex], 0.18);
    this.orb = this.add.circle(ORB_X, 0, ORB_RADIUS, COLORS[this.orbColorIndex]);
    this.orb.setDepth(10);
    this.orbGlow.setDepth(9);

    this.heightText = this.add
      .text(width / 2, 16, '0 m', {
        fontFamily: GAME_CONFIG.theme.fontFamily,
        fontSize: '26px',
        color: '#ffffff',
      })
      .setOrigin(0.5, 0)
      .setDepth(20);

    this.starText = this.add
      .text(width - 12, 16, '⭐ 0', {
        fontFamily: GAME_CONFIG.theme.fontFamily,
        fontSize: '18px',
        color: '#ffcc00',
      })
      .setOrigin(1, 0)
      .setDepth(20);

    this.bestLine = this.add.graphics().setDepth(19);
    this.bestLabel = this.add
      .text(8, 0, 'BEST', {
        fontFamily: GAME_CONFIG.theme.fontFamily,
        fontSize: '12px',
        color: '#8877aa',
      })
      .setDepth(19);

    this.input.on('pointerdown', () => {
      if (!this.isAlive) return;
      this.orbVY = JUMP_VY;
    });

    // Ensure some obstacles exist ahead of the orb immediately
    this.ensureObstaclesSpawned();

    this.engine.analytics.trackGameStart();
  }

  private createBackgroundDots(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 14; i++) {
      const color = COLORS[i % COLORS.length];
      const dot = this.add.circle(
        Phaser.Math.Between(10, width - 10),
        Phaser.Math.Between(0, height),
        Phaser.Math.Between(2, 4),
        color,
        0.25,
      );
      dot.setDepth(1);
      this.bgDots.push(dot);
    }
  }

  private obstacleWorldY(index: number): number {
    return -200 - index * OBSTACLE_GAP_Y;
  }

  private ensureObstaclesSpawned(): void {
    // Keep obstacles spawned somewhat above the current camera view.
    while (this.obstacleWorldY(this.nextObstacleIndex) > this.cameraY - 400) {
      this.spawnObstacle(this.nextObstacleIndex);
      this.nextObstacleIndex++;
    }
  }

  private pickObstacleType(index: number): ObstacleType {
    const types: ObstacleType[] = ['ring', 'bar', 'cross'];
    if (index < 10) {
      return types[index % 3];
    }
    return types[Phaser.Math.Between(0, 2)];
  }

  private spawnObstacle(index: number): void {
    const worldY = this.obstacleWorldY(index);
    const type = this.pickObstacleType(index);
    const direction = index % 2 === 0 ? 1 : -1;
    const rotSpeed = 60 + Math.min(this.passedCount * 6, 120);
    const barSpeed = 70 + Math.min(this.passedCount * 5, 110);

    const gfx = this.add.graphics();
    gfx.setDepth(6);

    const obstacle: Obstacle = {
      worldY,
      type,
      index,
      passed: false,
      nearMissCounted: false,
      gfx,
      radius: type === 'ring' ? RING_RADIUS : type === 'cross' ? 60 : 0,
      thickness: RING_THICKNESS,
      rotationDeg: Phaser.Math.Between(0, 359),
      rotSpeed,
      direction,
      barOffset: 0,
      barSpeed,
    };

    if (type === 'ring' || type === 'cross') {
      this.drawRingGraphic(gfx, obstacle.radius, obstacle.thickness);
    }

    this.obstacles.push(obstacle);

    // Star: 60px above the obstacle, random x
    const starX = Phaser.Math.Between(80, 320);
    const starObj = this.add.circle(starX, 0, STAR_RADIUS, 0xffcc00);
    starObj.setDepth(7);
    this.stars.push({ worldY: worldY - STAR_OFFSET_Y, x: starX, consumed: false, obj: starObj });

    // Color-swap pickup: 140px above the obstacle, on the orb's column
    const pickupObj = this.add.rectangle(ORB_X, 0, PICKUP_SIZE, PICKUP_SIZE, COLORS[0]);
    pickupObj.setDepth(7);
    this.pickups.push({ worldY: worldY - PICKUP_OFFSET_Y, x: ORB_X, consumed: false, obj: pickupObj });
  }

  /** Draws 4 colored quarter arcs (a ring made of quadrants) in local space, centered at (0,0). */
  private drawRingGraphic(gfx: Phaser.GameObjects.Graphics, radius: number, thickness: number): void {
    gfx.clear();
    for (let q = 0; q < 4; q++) {
      gfx.lineStyle(thickness, COLORS[q], 1);
      const startDeg = q * 90;
      const endDeg = startDeg + 90;
      gfx.beginPath();
      gfx.arc(0, 0, radius, Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(endDeg), false, 0.02);
      gfx.strokePath();
    }
  }

  /**
   * The bar is an infinite strip of 100px segments cycling through the 4 colors
   * (segment k has color COLORS[k mod 4]); `barOffset` shifts the strip so segment k
   * covers local-x range [k*100 - barOffset, k*100 - barOffset + 100). Drawing and
   * collision below share this same k formula so they always agree on color.
   */
  private redrawBarGraphic(obstacle: Obstacle): void {
    const gfx = obstacle.gfx;
    gfx.clear();
    const kMin = Math.floor((-100 + obstacle.barOffset) / BAR_SEGMENT_WIDTH) - 1;
    const kMax = Math.ceil((GAME_WIDTH + 100 + obstacle.barOffset) / BAR_SEGMENT_WIDTH) + 1;
    for (let k = kMin; k <= kMax; k++) {
      const segX = k * BAR_SEGMENT_WIDTH - obstacle.barOffset;
      const colorIdx = ((k % 4) + 4) % 4;
      gfx.fillStyle(COLORS[colorIdx], 1);
      gfx.fillRect(segX, -BAR_HEIGHT / 2, BAR_SEGMENT_WIDTH, BAR_HEIGHT);
    }
  }

  private barColorIndexAt(x: number, barOffset: number): number {
    const k = Math.floor((x + barOffset) / BAR_SEGMENT_WIDTH);
    return ((k % 4) + 4) % 4;
  }

  update(_time: number, delta: number): void {
    if (!this.isAlive) return;
    const dt = Math.min(delta, 50) / 1000; // clamp dt to avoid huge steps on tab-switch

    if (this.invulnerableMs > 0) this.invulnerableMs -= delta;

    this.prevOrbWorldY = this.orbWorldY;

    // Physics: gravity + terminal velocity
    this.orbVY += GRAVITY * dt;
    if (this.orbVY > TERMINAL_VY) this.orbVY = TERMINAL_VY;
    this.orbWorldY += this.orbVY * dt;

    // Camera only ever moves up (cameraY only decreases)
    this.cameraY = Math.min(this.cameraY, this.orbWorldY - 420);

    if (this.orbWorldY < this.minWorldYReached) this.minWorldYReached = this.orbWorldY;

    this.ensureObstaclesSpawned();
    this.updateObstacles(dt);
    this.updatePickups();
    this.updateStars();
    this.updateBackgroundDots(dt);
    this.updateOrbVisual();
    this.updateHUD();

    // Death: fell below the view
    const orbScreenY = this.orbWorldY - this.cameraY;
    if (this.invulnerableMs <= 0 && orbScreenY > GAME_HEIGHT + 30) {
      this.die();
      return;
    }

    this.checkAchievements();
  }

  private updateOrbVisual(): void {
    const screenY = this.orbWorldY - this.cameraY;
    this.orb.setPosition(ORB_X, screenY);
    this.orbGlow.setPosition(ORB_X, screenY);
  }

  private updateBackgroundDots(dt: number): void {
    const { width, height } = this.scale;
    for (const dot of this.bgDots) {
      dot.y -= 15 * dt;
      if (dot.y < -10) {
        dot.y = height + 10;
        dot.x = Phaser.Math.Between(10, width - 10);
      }
    }
  }

  private updateHUD(): void {
    const heightM = Math.max(0, Math.floor((START_Y - this.minWorldYReached) / HEIGHT_PER_METER));
    this.heightText.setText(`${heightM} m`);
    this.starText.setText(`⭐ ${this.starCount}`);

    // Best-height ghost line
    if (this.bestHeightMeters > 0) {
      const bestWorldY = START_Y - this.bestHeightMeters * HEIGHT_PER_METER;
      const screenY = bestWorldY - this.cameraY;
      if (screenY >= 0 && screenY <= GAME_HEIGHT) {
        this.bestLine.setVisible(true);
        this.bestLabel.setVisible(true);
        this.bestLine.clear();
        this.bestLine.lineStyle(2, 0x8877aa, 0.6);
        const dashLen = 10;
        for (let x = 0; x < GAME_WIDTH; x += dashLen * 2) {
          this.bestLine.lineBetween(x, screenY, Math.min(x + dashLen, GAME_WIDTH), screenY);
        }
        this.bestLabel.setPosition(8, screenY - 16);
      } else {
        this.bestLine.setVisible(false);
        this.bestLabel.setVisible(false);
      }
    } else {
      this.bestLine.setVisible(false);
      this.bestLabel.setVisible(false);
    }
  }

  private updateObstacles(dt: number): void {
    const loY = Math.min(this.prevOrbWorldY, this.orbWorldY);
    const hiY = Math.max(this.prevOrbWorldY, this.orbWorldY);

    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      const screenY = o.worldY - this.cameraY;

      // Cleanup obstacles long past
      if (screenY > GAME_HEIGHT + 400) {
        o.gfx.destroy();
        this.obstacles.splice(i, 1);
        continue;
      }
      if (screenY < -400) {
        // Not visible yet (far above); still simulate lightly but skip drawing work
        o.gfx.setVisible(false);
        continue;
      }
      o.gfx.setVisible(true);

      if (o.type === 'bar') {
        o.barOffset = ((o.barOffset + o.barSpeed * dt) % BAR_WRAP + BAR_WRAP) % BAR_WRAP;
        o.gfx.setPosition(0, screenY);
        this.redrawBarGraphic(o);

        const bandLo = o.worldY - BAR_HEIGHT / 2;
        const bandHi = o.worldY + BAR_HEIGHT / 2;
        if (!o.passed && this.invulnerableMs <= 0 && rangesOverlap(loY, hiY, bandLo, bandHi)) {
          const segColorIdx = this.barColorIndexAt(ORB_X, o.barOffset);
          if (COLORS[segColorIdx] !== this.orbColorIndexColor()) {
            this.die();
            return;
          }
        }

        if (!o.passed && this.orbWorldY < o.worldY - BAR_HEIGHT / 2 - 2) {
          this.markPassed(o);
        }
      } else {
        // ring or cross-as-ring
        o.rotationDeg = normalizeDeg(o.rotationDeg + o.rotSpeed * o.direction * dt);
        o.gfx.setPosition(ORB_X, screenY);
        o.gfx.setRotation(Phaser.Math.DegToRad(o.rotationDeg));

        const bandInner = o.radius - o.thickness;
        const bandOuter = o.radius + o.thickness;
        const bottomLo = o.worldY + bandInner;
        const bottomHi = o.worldY + bandOuter;
        const topLo = o.worldY - bandOuter;
        const topHi = o.worldY - bandInner;

        const crossesBottom = rangesOverlap(loY, hiY, bottomLo, bottomHi);
        const crossesTop = rangesOverlap(loY, hiY, topLo, topHi);

        if (!o.passed && this.invulnerableMs <= 0 && (crossesBottom || crossesTop)) {
          const rawAngle = crossesBottom ? 90 : 270;
          const effectiveAngle = normalizeDeg(rawAngle - o.rotationDeg);
          const quadrant = Math.floor(effectiveAngle / 90) % 4;

          const angleInQuadrant = effectiveAngle % 90;
          const nearBoundary = Math.min(angleInQuadrant, 90 - angleInQuadrant) <= 12;
          if (nearBoundary && !o.nearMissCounted) {
            o.nearMissCounted = true;
            this.nearMissCount++;
          }

          if (COLORS[quadrant] !== this.orbColorIndexColor()) {
            this.die();
            return;
          }
        }

        if (!o.passed && this.orbWorldY < o.worldY - bandOuter - 2) {
          this.markPassed(o);
        }
      }
    }
  }

  private orbColorIndexColor(): number {
    return COLORS[this.orbColorIndex];
  }

  private markPassed(o: Obstacle): void {
    o.passed = true;
    this.passedCount++;
    const result = this.engine.xp.addXP(3);
    if (result.leveledUp) {
      // No dedicated level-up banner required by spec; XP is tracked silently in-run.
    }
  }

  private updatePickups(): void {
    for (const p of this.pickups) {
      if (p.consumed) continue;
      const screenY = p.worldY - this.cameraY;
      p.obj.setPosition(p.x, screenY);
      p.obj.rotation += 0.05;

      const dx = p.x - ORB_X;
      const dy = p.worldY - this.orbWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < PICKUP_RADIUS) {
        p.consumed = true;
        p.obj.setVisible(false);
        let next = Phaser.Math.Between(0, COLORS.length - 1);
        while (next === this.orbColorIndex && COLORS.length > 1) {
          next = Phaser.Math.Between(0, COLORS.length - 1);
        }
        this.orbColorIndex = next;
        this.flashOrb();
      }
    }
  }

  private updateStars(): void {
    for (const s of this.stars) {
      if (s.consumed) continue;
      const screenY = s.worldY - this.cameraY;
      s.obj.setPosition(s.x, screenY);

      const dx = s.x - ORB_X;
      const dy = s.worldY - this.orbWorldY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < STAR_RADIUS + ORB_RADIUS + 4) {
        s.consumed = true;
        s.obj.setVisible(false);
        this.starCount++;
        this.engine.currency.earn(1);
        const lifetime = this.engine.storage.get<number>('lifetimeStars', 0) + 1;
        this.engine.storage.set('lifetimeStars', lifetime);
        this.showFloatingText(s.x, screenY, '+⭐');
      }
    }
  }

  private flashOrb(): void {
    const screenY = this.orbWorldY - this.cameraY;
    this.orb.setFillStyle(COLORS[this.orbColorIndex]);
    this.orbGlow.setFillStyle(COLORS[this.orbColorIndex]);

    const ring = this.add.circle(ORB_X, screenY, ORB_RADIUS, COLORS[this.orbColorIndex], 0);
    ring.setStrokeStyle(3, COLORS[this.orbColorIndex], 1);
    ring.setDepth(11);
    this.tweens.add({
      targets: ring,
      radius: ORB_RADIUS + 24,
      alpha: 0,
      duration: 350,
      onUpdate: () => ring.setStrokeStyle(3, COLORS[this.orbColorIndex], ring.alpha),
      onComplete: () => ring.destroy(),
    });
  }

  private showFloatingText(x: number, y: number, msg: string): void {
    const t = this.add
      .text(x, y, msg, {
        fontFamily: GAME_CONFIG.theme.fontFamily,
        fontSize: '16px',
        color: '#ffcc00',
      })
      .setOrigin(0.5)
      .setDepth(21);
    this.tweens.add({
      targets: t,
      y: y - 40,
      alpha: 0,
      duration: 700,
      onComplete: () => t.destroy(),
    });
  }

  private checkAchievements(): void {
    const heightM = Math.max(0, Math.floor((START_Y - this.minWorldYReached) / HEIGHT_PER_METER));
    const acm = this.engine.achievements;
    if (heightM >= 50) acm.unlock('height_50');
    if (heightM >= 150) acm.unlock('height_150');
    if (heightM >= 300) acm.unlock('height_300');
    const lifetime = this.engine.storage.get<number>('lifetimeStars', 0);
    if (lifetime >= 25) acm.unlock('stars_25');
    if (this.nearMissCount >= 10) acm.unlock('near_miss_10');
  }

  private die(): void {
    if (!this.isAlive) return;
    this.isAlive = false;

    this.cameras.main.shake(250, 0.02);

    this.tweens.add({
      targets: [this.orb, this.orbGlow],
      scale: 2.2,
      alpha: 0,
      duration: 550,
      ease: 'Power2',
    });

    const heightM = Math.max(0, Math.floor((START_Y - this.minWorldYReached) / HEIGHT_PER_METER));

    this.time.delayedCall(600, () => {
      this.engine.analytics.trackGameOver(heightM);
      this.scene.start('GameOverScene', {
        engine: this.engine,
        height: heightM,
        stars: this.starCount,
        revived: this.revived,
      });
    });
  }
}
