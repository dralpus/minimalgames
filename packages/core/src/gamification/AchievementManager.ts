import type { Achievement } from '../config/types';
import type { StorageManager } from '../storage/StorageManager';

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
}

export type AchievementUnlockCallback = (achievement: Achievement) => void;

export class AchievementManager {
  private definitions: Map<string, AchievementDef> = new Map();
  private storage: StorageManager;
  private listeners: Set<AchievementUnlockCallback> = new Set();

  constructor(storage: StorageManager) {
    this.storage = storage;
  }

  register(definitions: AchievementDef[]): void {
    definitions.forEach((def) => this.definitions.set(def.id, def));
  }

  unlock(id: string): Achievement | null {
    const def = this.definitions.get(id);
    if (!def || this.isUnlocked(id)) return null;

    const achievement: Achievement = {
      id: def.id,
      name: def.name,
      description: def.description,
      unlockedAt: Date.now(),
    };

    const unlocked = this.storage.get<Achievement[]>('achievements', []);
    unlocked.push(achievement);
    this.storage.set('achievements', unlocked);

    this.listeners.forEach((cb) => cb(achievement));
    return achievement;
  }

  isUnlocked(id: string): boolean {
    const unlocked = this.storage.get<Achievement[]>('achievements', []);
    return unlocked.some((a) => a.id === id);
  }

  getUnlocked(): Achievement[] {
    return this.storage.get<Achievement[]>('achievements', []);
  }

  getAll(): Array<Achievement & { unlocked: boolean }> {
    const unlocked = this.getUnlocked();
    return Array.from(this.definitions.values()).map((def) => {
      const found = unlocked.find((a) => a.id === def.id);
      return { ...def, unlockedAt: found?.unlockedAt ?? null, unlocked: !!found };
    });
  }

  onUnlock(cb: AchievementUnlockCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  reset(): void {
    this.storage.set('achievements', []);
  }
}
