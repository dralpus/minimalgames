import { describe, it, expect, beforeEach } from 'vitest';
import { StorageManager } from '../src/storage/StorageManager';

describe('StorageManager', () => {
  let storage: StorageManager;

  beforeEach(() => {
    localStorage.clear();
    storage = new StorageManager('test-game');
  });

  it('returns default when key not set', () => {
    expect(storage.get('missing', 42)).toBe(42);
    expect(storage.get('missing-str', 'hello')).toBe('hello');
  });

  it('stores and retrieves values', () => {
    storage.set('score', 9999);
    expect(storage.get('score', 0)).toBe(9999);
  });

  it('stores complex objects', () => {
    const data = { level: 5, items: ['sword', 'shield'] };
    storage.set('player', data);
    expect(storage.get('player', {})).toEqual(data);
  });

  it('deletes a key', () => {
    storage.set('temp', 'value');
    storage.delete('temp');
    expect(storage.get('temp', 'default')).toBe('default');
  });

  it('namespaces keys by game id', () => {
    storage.set('score', 100);
    const other = new StorageManager('other-game');
    expect(other.get('score', 0)).toBe(0); // different namespace
  });
});
