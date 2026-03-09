import { describe, it, expect, beforeEach } from 'vitest';
import { CurrencyManager } from '../src/monetization/CurrencyManager';
import { StorageManager } from '../src/storage/StorageManager';

function makeStorage() {
  return new StorageManager('test');
}

describe('CurrencyManager', () => {
  let currency: CurrencyManager;

  beforeEach(() => {
    localStorage.clear();
    currency = new CurrencyManager(makeStorage());
  });

  it('starts at 0', () => {
    expect(currency.getBalance()).toBe(0);
  });

  it('earns coins', () => {
    currency.earn(100);
    expect(currency.getBalance()).toBe(100);
  });

  it('spends coins when balance is sufficient', () => {
    currency.earn(100);
    const result = currency.spend(60);
    expect(result).toBe(true);
    expect(currency.getBalance()).toBe(40);
  });

  it('refuses to spend when balance is insufficient', () => {
    currency.earn(10);
    const result = currency.spend(50);
    expect(result).toBe(false);
    expect(currency.getBalance()).toBe(10);
  });

  it('fires onChange callbacks', () => {
    const changes: number[] = [];
    currency.onChange((bal) => changes.push(bal));
    currency.earn(50);
    currency.spend(20);
    expect(changes).toEqual([50, 30]);
  });

  it('resets to 0', () => {
    currency.earn(500);
    currency.reset();
    expect(currency.getBalance()).toBe(0);
  });
});
