import type { ThemeTokens } from '../config/types';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

const COLORS: Record<ToastType, string> = {
  info: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
};

export class Toast {
  private container: HTMLElement;

  constructor(theme?: ThemeTokens) {
    this.container = document.createElement('div');
    this.container.style.cssText = `
      position: fixed;
      top: 60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9500;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
      width: min(340px, 90vw);
      font-family: ${theme?.fontFamily ?? 'system-ui, sans-serif'};
    `;
    document.body.appendChild(this.container);
  }

  show(message: string, type: ToastType = 'info', duration = 3000): void {
    const color = COLORS[type];
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
      background: rgba(0,0,0,0.88);
      border-left: 4px solid ${color};
      border-radius: 8px;
      padding: 12px 18px;
      color: white;
      font-size: 14px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      opacity: 0;
      transition: opacity 0.2s ease;
      width: 100%;
      text-align: center;
      pointer-events: none;
    `;

    this.container.appendChild(toast);
    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
  }

  success(message: string, duration?: number): void {
    this.show(message, 'success', duration);
  }

  error(message: string, duration?: number): void {
    this.show(message, 'error', duration);
  }

  info(message: string, duration?: number): void {
    this.show(message, 'info', duration);
  }

  destroy(): void {
    this.container.remove();
  }
}
