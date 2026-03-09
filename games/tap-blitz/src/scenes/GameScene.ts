import Phaser from 'phaser';
import type { GameEngine } from '@core';
import {
  GAME_CONFIG, TARGET_COLORS, TARGET_RADIUS_MIN, TARGET_RADIUS_MAX,
  TARGET_LIFETIME, TARGETS_ON_SCREEN, ROUND_DURATION,
  STREAK_MULTIPLIERS, XP_PER_TAP, GAME_WIDTH, GAME_HEIGHT,
} from '../config';

interface Target extends Phaser.GameObjects.Arc {
  colorIndex: number;
  spawnTime: number;
  timerBar: Phaser.GameObjects.Rectangle;
  timerBarBg: Phaser.GameObjects.Rectangle;
}

export class GameScene extends Phaser.Scene {
  private engine!: GameEngine;
  private targets: Target[] = [];
  private requiredColorIndex = 0;
  private score = 0;
  private streak = 0;
  private timeLeft = ROUND_DURATION;
  private scoreText!: Phaser.GameObjects.Text;
  private streakText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private colorIndicator!: Phaser.GameObjects.Arc;
  private colorLabel!: Phaser.GameObjects.Text;
  private multiplierText!: Phaser.GameObjects.Text;
  private countdownTimer!: Phaser.Time.TimerEvent;
  private spawnTimer!: Phaser.Time.TimerEvent;
  private isRunning = true;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { engine: GameEngine }): void {
    this.engine = data.engine;
    this.score = 0;
    this.streak = 0;
    this.timeLeft = ROUND_DURATION;
    this.isRunning = true;
    this.targets = [];
  }

  create(): void {
    const { width, height } = this.scale;
    const theme = GAME_CONFIG.theme;

    // Background
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // Top bar
    this.add.rectangle(width / 2, 52, width, 104, 0x16213e);

    // Required color indicator
    this.colorIndicator = this.add.circle(60, 52, 32, 0xffffff);
    this.colorIndicator.setStrokeStyle(3, 0xffffff);

    this.add.text(24, 18, 'TAP:', {
      fontFamily: theme.fontFamily,
      fontSize: '13px',
      color: '#888',
    });

    this.colorLabel = this.add.text(110, 52, '', {
      fontFamily: theme.fontFamily,
      fontSize: '22px',
      color: 'white',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);

    // Score
    this.scoreText = this.add.text(width - 12, 18, '0', {
      fontFamily: theme.fontFamily,
      fontSize: '24px',
      color: theme.primary,
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    // Streak
    this.streakText = this.add.text(width - 12, 46, '', {
      fontFamily: theme.fontFamily,
      fontSize: '14px',
      color: theme.accent,
    }).setOrigin(1, 0);

    // Multiplier
    this.multiplierText = this.add.text(width - 12, 64, '×1', {
      fontFamily: theme.fontFamily,
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold',
    }).setOrigin(1, 0);

    // Timer bar
    const timerBg = this.add.rectangle(width / 2, 98, width - 24, 8, 0x333355).setOrigin(0.5);
    const timerBar = this.add.rectangle(12, 98, width - 24, 8, 0xf72585).setOrigin(0, 0.5);
    this.add.text(12, 98 - 14, `${this.timeLeft}s`, {
      fontFamily: theme.fontFamily,
      fontSize: '12px',
      color: '#888',
    });
    this.timerText = this.add.text(12, 98 - 14, '', {
      fontFamily: theme.fontFamily,
      fontSize: '14px',
      color: '#f72585',
      fontStyle: 'bold',
    });

    // Countdown
    this.countdownTimer = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft--;
        this.timerText.setText(`${this.timeLeft}s`);
        timerBar.width = Math.max(0, (this.timeLeft / ROUND_DURATION) * (width - 24));
        if (this.timeLeft <= 0) {
          this.endRound();
        }
      },
      loop: true,
    });

    // Spawn targets
    this.spawnTimer = this.time.addEvent({
      delay: 500,
      callback: this.spawnTargetIfNeeded,
      callbackScope: this,
      loop: true,
    });

    // Pick first required color
    this.pickNewRequiredColor();

    this.engine.analytics.trackGameStart();
  }

  private pickNewRequiredColor(): void {
    this.requiredColorIndex = Phaser.Math.Between(0, TARGET_COLORS.length - 1);
    const color = TARGET_COLORS[this.requiredColorIndex];
    this.colorIndicator.setFillStyle(color.hex);
    this.colorLabel.setText(color.name);
    this.colorLabel.setColor(color.css);
  }

  private spawnTargetIfNeeded(): void {
    if (!this.isRunning || this.targets.length >= TARGETS_ON_SCREEN) return;
    this.spawnTarget();
  }

  private spawnTarget(): void {
    const { width, height } = this.scale;
    const margin = 60;
    const topMargin = 120;
    const radius = Phaser.Math.Between(TARGET_RADIUS_MIN, TARGET_RADIUS_MAX);
    const x = Phaser.Math.Between(margin + radius, width - margin - radius);
    const y = Phaser.Math.Between(topMargin + radius, height - margin - radius);
    const colorIndex = Phaser.Math.Between(0, TARGET_COLORS.length - 1);
    const color = TARGET_COLORS[colorIndex];

    // Timer bar background
    const timerBarBg = this.add.rectangle(x, y + radius + 8, radius * 2, 5, 0x333355).setOrigin(0.5);
    const timerBar = this.add.rectangle(x - radius, y + radius + 8, radius * 2, 5, color.hex).setOrigin(0, 0.5);

    const target = this.add.circle(x, y, radius, color.hex) as Target;
    target.setStrokeStyle(3, 0xffffff, 0.3);
    target.colorIndex = colorIndex;
    target.spawnTime = this.time.now;
    target.timerBar = timerBar;
    target.timerBarBg = timerBarBg;
    target.setDepth(5);
    target.setInteractive();

    // Bounce-in animation
    target.setScale(0);
    this.tweens.add({
      targets: target,
      scale: 1,
      duration: 150,
      ease: 'Back.easeOut',
    });

    target.on('pointerdown', () => this.onTargetTap(target));
    this.targets.push(target);
  }

  private onTargetTap(target: Target): void {
    if (!this.isRunning) return;

    const isCorrect = target.colorIndex === this.requiredColorIndex;

    if (isCorrect) {
      this.streak++;
      const multiplier = STREAK_MULTIPLIERS[Math.min(this.streak - 1, STREAK_MULTIPLIERS.length - 1)];
      const points = Math.round(100 * multiplier);
      this.score += points;
      this.scoreText.setText(String(this.score));

      const mIdx = Math.min(this.streak - 1, STREAK_MULTIPLIERS.length - 1);
      this.multiplierText.setText(`×${STREAK_MULTIPLIERS[mIdx]}`);
      this.multiplierText.setColor(this.streak >= 4 ? '#ffd700' : '#ffffff');

      if (this.streak > 1) {
        this.streakText.setText(`🔥 ${this.streak} streak`);
      }

      // Floating score
      this.showFloatingScore(`+${points}`, target.x, target.y, '#2dc653');

      // XP
      this.engine.xp.addXP(XP_PER_TAP);

      // Achievement checks
      this.checkAchievements();

      // Remove correct target, pick new color
      this.removeTarget(target, true);
      this.pickNewRequiredColor();

      // Haptic
      if (navigator.vibrate) navigator.vibrate(20);
    } else {
      // Wrong tap
      this.streak = 0;
      this.multiplierText.setText('×1');
      this.multiplierText.setColor('#ffffff');
      this.streakText.setText('');
      this.cameras.main.shake(120, 0.008);
      this.showFloatingScore('WRONG!', target.x, target.y, '#e63946');
      if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
    }
  }

  private removeTarget(target: Target, correct: boolean): void {
    const idx = this.targets.indexOf(target);
    if (idx >= 0) this.targets.splice(idx, 1);

    this.tweens.add({
      targets: target,
      scale: correct ? 1.4 : 0,
      alpha: 0,
      duration: 200,
      ease: correct ? 'Power2' : 'Linear',
      onComplete: () => {
        target.timerBar.destroy();
        target.timerBarBg.destroy();
        target.destroy();
      },
    });
  }

  private showFloatingScore(text: string, x: number, y: number, color: string): void {
    const t = this.add.text(x, y - 20, text, {
      fontFamily: GAME_CONFIG.theme.fontFamily,
      fontSize: '22px',
      color,
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(20);

    this.tweens.add({
      targets: t,
      y: y - 80,
      alpha: 0,
      duration: 800,
      ease: 'Power2',
      onComplete: () => t.destroy(),
    });
  }

  update(time: number): void {
    if (!this.isRunning) return;

    // Expire old targets
    for (let i = this.targets.length - 1; i >= 0; i--) {
      const t = this.targets[i];
      const age = time - t.spawnTime;
      const remaining = Math.max(0, 1 - age / TARGET_LIFETIME);
      t.timerBar.width = remaining * (t.radius * 2);
      if (age >= TARGET_LIFETIME) {
        this.removeTarget(t, false);
        // Miss penalty on required color
        if (t.colorIndex === this.requiredColorIndex) {
          this.streak = 0;
          this.multiplierText.setText('×1');
          this.streakText.setText('');
          this.pickNewRequiredColor();
        }
      }
    }
  }

  private checkAchievements(): void {
    const acm = this.engine.achievements;
    if (this.score >= 500) acm.unlock('score_500');
    if (this.score >= 2000) acm.unlock('score_2000');
    if (this.streak >= 5) acm.unlock('streak_5');
    if (this.streak >= 10) acm.unlock('streak_10');
    if (this.streak >= 20) acm.unlock('streak_20');
  }

  private endRound(): void {
    this.isRunning = false;
    this.countdownTimer.destroy();
    this.spawnTimer.destroy();
    this.engine.analytics.trackGameOver(this.score);
    this.time.delayedCall(400, () => {
      this.scene.start('GameOverScene', { engine: this.engine, score: this.score, streak: this.streak });
    });
  }
}
