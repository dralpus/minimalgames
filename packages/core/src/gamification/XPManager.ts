import type { XPResult } from '../config/types';
import type { StorageManager } from '../storage/StorageManager';

/** XP required to reach a given level. Uses exponential curve. */
function xpForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.4, level - 1));
}

/** Cumulative XP threshold to reach a level */
function cumulativeXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += xpForLevel(i);
  return total;
}

/** Level for a given cumulative XP total */
function levelForXP(xp: number): number {
  let level = 1;
  while (xp >= cumulativeXPForLevel(level + 1)) level++;
  return level;
}

export class XPManager {
  private storage: StorageManager;

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  addXP(amount: number, _reason = ''): XPResult {
    const previousXP = this.storage.get<number>('xp', 0);
    const previousLevel = levelForXP(previousXP);
    const newXP = previousXP + Math.max(0, amount);
    const newLevel = levelForXP(newXP);
    this.storage.set('xp', newXP);
    return {
      previousXP,
      newXP,
      previousLevel,
      newLevel,
      leveledUp: newLevel > previousLevel,
      xpAdded: amount,
    };
  }

  getXP(): number {
    return this.storage.get<number>('xp', 0);
  }

  getLevel(): number {
    return levelForXP(this.getXP());
  }

  /** XP needed to complete the current level */
  getXPToNextLevel(): number {
    const level = this.getLevel();
    return xpForLevel(level);
  }

  /** Progress within current level (0–1) */
  getLevelProgress(): number {
    const xp = this.getXP();
    const level = this.getLevel();
    const levelStart = cumulativeXPForLevel(level);
    const levelEnd = cumulativeXPForLevel(level + 1);
    return (xp - levelStart) / (levelEnd - levelStart);
  }

  reset(): void {
    this.storage.set('xp', 0);
  }
}
