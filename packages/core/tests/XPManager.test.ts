import { describe, it, expect, beforeEach } from 'vitest';
import { XPManager } from '../src/gamification/XPManager';
import { StorageManager } from '../src/storage/StorageManager';

function makeStorage() {
  return new StorageManager('test');
}

describe('XPManager', () => {
  let xp: XPManager;

  beforeEach(() => {
    localStorage.clear();
    xp = new XPManager(makeStorage());
  });

  it('starts at 0 XP and level 1', () => {
    expect(xp.getXP()).toBe(0);
    expect(xp.getLevel()).toBe(1);
  });

  it('adds XP correctly', () => {
    const result = xp.addXP(50);
    expect(result.newXP).toBe(50);
    expect(result.xpAdded).toBe(50);
  });

  it('levels up when enough XP is accumulated', () => {
    const result = xp.addXP(100); // Level 1 needs 100 XP
    expect(result.leveledUp).toBe(true);
    expect(result.newLevel).toBeGreaterThan(1);
  });

  it('ignores negative XP', () => {
    xp.addXP(50);
    xp.addXP(-999);
    expect(xp.getXP()).toBe(50);
  });

  it('resets to 0', () => {
    xp.addXP(500);
    xp.reset();
    expect(xp.getXP()).toBe(0);
    expect(xp.getLevel()).toBe(1);
  });

  it('returns level progress between 0 and 1', () => {
    xp.addXP(50);
    const progress = xp.getLevelProgress();
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(1);
  });
});
