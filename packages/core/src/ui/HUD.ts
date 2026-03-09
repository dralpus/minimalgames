import type { ThemeTokens } from '../config/types';

export interface HUDConfig {
  theme?: ThemeTokens;
  position?: 'top' | 'bottom';
}

export interface HUDItem {
  id: string;
  icon?: string;   // emoji or text icon
  label?: string;
  value: string | number;
}

/**
 * HUD: a skinnable heads-up display bar for mobile games.
 * Overlays on top of the game canvas.
 */
export class HUD {
  private el: HTMLElement;
  private items: Map<string, HTMLElement> = new Map();

  constructor(config: HUDConfig = {}) {
    const theme = config.theme;
    const pos = config.position ?? 'top';

    this.el = document.createElement('div');
    this.el.id = 'mg-hud';
    this.el.style.cssText = `
      position: fixed;
      ${pos}: 0;
      left: 0;
      right: 0;
      height: 52px;
      background: linear-gradient(
        ${pos === 'top' ? 'to bottom' : 'to top'},
        ${theme?.background ?? 'rgba(0,0,0,0.85)'},
        transparent
      );
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 0 16px;
      z-index: 7000;
      pointer-events: none;
      font-family: ${theme?.fontFamily ?? 'system-ui, sans-serif'};
    `;
    document.body.appendChild(this.el);
  }

  addItem(item: HUDItem): void {
    const el = document.createElement('div');
    el.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      color: white;
      font-size: 16px;
      font-weight: 700;
      text-shadow: 0 1px 4px rgba(0,0,0,0.8);
    `;
    el.innerHTML = `
      ${item.icon ? `<span>${item.icon}</span>` : ''}
      ${item.label ? `<span style="font-size:12px;opacity:0.7;">${item.label}</span>` : ''}
      <span class="mg-hud-value">${item.value}</span>
    `;
    this.el.appendChild(el);
    this.items.set(item.id, el);
  }

  update(id: string, value: string | number): void {
    const el = this.items.get(id);
    if (!el) return;
    const valueEl = el.querySelector('.mg-hud-value');
    if (valueEl) valueEl.textContent = String(value);
  }

  show(): void {
    this.el.style.display = 'flex';
  }

  hide(): void {
    this.el.style.display = 'none';
  }

  destroy(): void {
    this.el.remove();
    this.items.clear();
  }
}
