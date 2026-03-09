import type { ThemeTokens } from '../config/types';

export interface ModalOptions {
  title: string;
  body?: string;
  bodyHTML?: string;
  actions?: Array<{ label: string; primary?: boolean; onClick: () => void }>;
  dismissible?: boolean;
  theme?: ThemeTokens;
}

export class Modal {
  private el: HTMLElement | null = null;

  show(options: ModalOptions): void {
    this.hide();

    const theme = options.theme;
    const overlay = document.createElement('div');
    overlay.className = 'mg-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 8000;
      padding: 16px;
      font-family: ${theme?.fontFamily ?? 'system-ui, sans-serif'};
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: ${theme?.background ?? '#1e1e2e'};
      border: 1px solid ${theme?.primary ?? '#7c3aed'};
      border-radius: ${theme?.borderRadius ?? '12px'};
      padding: 24px;
      max-width: 380px;
      width: 100%;
      color: white;
      text-align: center;
      box-shadow: 0 0 40px rgba(0,0,0,0.5);
    `;

    const title = document.createElement('h2');
    title.textContent = options.title;
    title.style.cssText = `
      margin: 0 0 12px;
      font-size: 22px;
      color: ${theme?.primary ?? '#a78bfa'};
    `;
    box.appendChild(title);

    if (options.bodyHTML) {
      const bodyEl = document.createElement('div');
      bodyEl.innerHTML = options.bodyHTML;
      bodyEl.style.cssText = 'margin-bottom: 20px; font-size: 15px; color: #ccc; line-height: 1.5;';
      box.appendChild(bodyEl);
    } else if (options.body) {
      const bodyEl = document.createElement('p');
      bodyEl.textContent = options.body;
      bodyEl.style.cssText = 'margin-bottom: 20px; font-size: 15px; color: #ccc;';
      box.appendChild(bodyEl);
    }

    if (options.actions?.length) {
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;';
      options.actions.forEach(({ label, primary, onClick }) => {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.style.cssText = `
          padding: 12px 24px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 15px;
          font-weight: 600;
          min-width: 120px;
          background: ${primary ? (theme?.primary ?? '#7c3aed') : 'transparent'};
          color: ${primary ? 'white' : (theme?.primary ?? '#a78bfa')};
          border: 2px solid ${theme?.primary ?? '#7c3aed'};
          transition: opacity 0.15s;
        `;
        btn.addEventListener('touchstart', () => (btn.style.opacity = '0.7'));
        btn.addEventListener('touchend', () => (btn.style.opacity = '1'));
        btn.onclick = () => { this.hide(); onClick(); };
        btnRow.appendChild(btn);
      });
      box.appendChild(btnRow);
    }

    if (options.dismissible !== false) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) this.hide();
      });
    }

    overlay.appendChild(box);
    document.body.appendChild(overlay);
    this.el = overlay;
  }

  hide(): void {
    if (this.el) {
      this.el.remove();
      this.el = null;
    }
  }

  isVisible(): boolean {
    return this.el !== null;
  }
}
