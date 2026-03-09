import type { StorageManager } from '../storage/StorageManager';

export type CurrencyChangeCallback = (newBalance: number, delta: number) => void;

export class CurrencyManager {
  private storage: StorageManager;
  private key: string;
  private listeners: Set<CurrencyChangeCallback> = new Set();

  constructor(storage: StorageManager, currencyKey = 'coins') {
    this.storage = storage;
    this.key = currencyKey;
  }

  getBalance(): number {
    return this.storage.get<number>(this.key, 0);
  }

  earn(amount: number): void {
    const current = this.getBalance();
    const next = current + Math.max(0, amount);
    this.storage.set(this.key, next);
    this.listeners.forEach((cb) => cb(next, amount));
  }

  spend(amount: number): boolean {
    const current = this.getBalance();
    if (current < amount) return false;
    const next = current - amount;
    this.storage.set(this.key, next);
    this.listeners.forEach((cb) => cb(next, -amount));
    return true;
  }

  set(amount: number): void {
    this.storage.set(this.key, Math.max(0, amount));
    this.listeners.forEach((cb) => cb(amount, 0));
  }

  onChange(cb: CurrencyChangeCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  reset(): void {
    this.set(0);
  }
}
