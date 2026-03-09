import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AchievementManager } from '../src/gamification/AchievementManager';
import { StorageManager } from '../src/storage/StorageManager';

function makeManager() {
  localStorage.clear();
  const storage = new StorageManager('test');
  const mgr = new AchievementManager(storage);
  mgr.register([
    { id: 'first_game', name: 'First Game', description: 'Play your first game' },
    { id: 'high_score', name: 'High Scorer', description: 'Score over 1000' },
  ]);
  return mgr;
}

describe('AchievementManager', () => {
  let mgr: AchievementManager;

  beforeEach(() => {
    mgr = makeManager();
  });

  it('starts with no unlocked achievements', () => {
    expect(mgr.getUnlocked()).toHaveLength(0);
  });

  it('unlocks an achievement', () => {
    const result = mgr.unlock('first_game');
    expect(result).not.toBeNull();
    expect(result!.id).toBe('first_game');
    expect(mgr.isUnlocked('first_game')).toBe(true);
  });

  it('does not unlock the same achievement twice', () => {
    mgr.unlock('first_game');
    const second = mgr.unlock('first_game');
    expect(second).toBeNull();
    expect(mgr.getUnlocked()).toHaveLength(1);
  });

  it('fires onUnlock callback', () => {
    const cb = vi.fn();
    mgr.onUnlock(cb);
    mgr.unlock('high_score');
    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0].id).toBe('high_score');
  });

  it('returns all achievements with unlock status', () => {
    mgr.unlock('first_game');
    const all = mgr.getAll();
    expect(all).toHaveLength(2);
    const first = all.find((a) => a.id === 'first_game');
    const second = all.find((a) => a.id === 'high_score');
    expect(first!.unlocked).toBe(true);
    expect(second!.unlocked).toBe(false);
  });

  it('resets all achievements', () => {
    mgr.unlock('first_game');
    mgr.reset();
    expect(mgr.getUnlocked()).toHaveLength(0);
  });
});
