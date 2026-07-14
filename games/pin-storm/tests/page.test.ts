import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { describe, it, expect } from 'vitest';

const root = resolve(__dirname, '..');

function parseHTML(file: string): Document {
  const html = readFileSync(file, 'utf-8');
  return new DOMParser().parseFromString(html, 'text/html');
}

describe('pin-storm source page', () => {
  const doc = parseHTML(resolve(root, 'index.html'));

  it('has #game-container div', () => {
    expect(doc.getElementById('game-container')).not.toBeNull();
  });

  it('has correct title', () => {
    expect(doc.title).toBe('Pin Storm');
  });

  it('has a module script entry point', () => {
    const scripts = doc.querySelectorAll('script[type="module"]');
    expect(scripts.length).toBeGreaterThan(0);
  });

  it('sets touch-action: none to prevent scroll interference', () => {
    const style = doc.querySelector('style')?.textContent ?? '';
    expect(style).toContain('touch-action: none');
  });
});

describe('pin-storm built page', () => {
  const distHtml = resolve(root, 'dist/index.html');

  it('dist/index.html exists after build', () => {
    expect(existsSync(distHtml), 'dist/index.html missing — run pnpm build first').toBe(true);
  });

  it('built page has #game-container and a hashed JS bundle', () => {
    if (!existsSync(distHtml)) return;
    const doc = parseHTML(distHtml);
    expect(doc.getElementById('game-container')).not.toBeNull();
    const scripts = doc.querySelectorAll('script[type="module"]');
    expect(scripts.length).toBeGreaterThan(0);
    const src = scripts[0].getAttribute('src') ?? '';
    expect(src).toMatch(/assets\/index-[A-Za-z0-9_-]+\.js/);
  });
});
