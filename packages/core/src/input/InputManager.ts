export interface TouchPoint {
  x: number;
  y: number;
  id: number;
}

export interface SwipeEvent {
  direction: 'up' | 'down' | 'left' | 'right';
  velocity: number;
  distance: number;
}

export type InputCallback<T> = (event: T) => void;

/**
 * InputManager: unified touch, swipe, and tap input for mobile-web games.
 * Works directly with native touch events — no Hammer.js dependency required.
 */
export class InputManager {
  private element: HTMLElement;
  private tapCallbacks: Set<InputCallback<TouchPoint>> = new Set();
  private swipeCallbacks: Set<InputCallback<SwipeEvent>> = new Set();
  private holdCallbacks: Set<InputCallback<TouchPoint>> = new Set();
  private touchStartPos: Map<number, { x: number; y: number; time: number }> = new Map();
  private holdTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();
  private readonly SWIPE_THRESHOLD = 30;
  private readonly HOLD_DURATION = 400;

  constructor(element: HTMLElement) {
    this.element = element;
    this.attach();
  }

  private attach(): void {
    this.element.addEventListener('touchstart', this.onTouchStart, { passive: true });
    this.element.addEventListener('touchend', this.onTouchEnd, { passive: true });
    this.element.addEventListener('touchcancel', this.onTouchCancel, { passive: true });
  }

  private onTouchStart = (e: TouchEvent): void => {
    Array.from(e.changedTouches).forEach((t) => {
      this.touchStartPos.set(t.identifier, { x: t.clientX, y: t.clientY, time: Date.now() });
      const timer = setTimeout(() => {
        this.holdCallbacks.forEach((cb) =>
          cb({ x: t.clientX, y: t.clientY, id: t.identifier }),
        );
        this.touchStartPos.delete(t.identifier);
      }, this.HOLD_DURATION);
      this.holdTimers.set(t.identifier, timer);
    });
  };

  private onTouchEnd = (e: TouchEvent): void => {
    Array.from(e.changedTouches).forEach((t) => {
      const start = this.touchStartPos.get(t.identifier);
      const timer = this.holdTimers.get(t.identifier);
      if (timer) { clearTimeout(timer); this.holdTimers.delete(t.identifier); }

      if (!start) return;
      this.touchStartPos.delete(t.identifier);

      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dt = Date.now() - start.time;

      if (dist < this.SWIPE_THRESHOLD) {
        // Tap
        this.tapCallbacks.forEach((cb) =>
          cb({ x: t.clientX, y: t.clientY, id: t.identifier }),
        );
      } else {
        // Swipe
        const velocity = dist / dt;
        const direction =
          Math.abs(dx) > Math.abs(dy)
            ? dx > 0
              ? 'right'
              : 'left'
            : dy > 0
              ? 'down'
              : 'up';
        this.swipeCallbacks.forEach((cb) => cb({ direction, velocity, distance: dist }));
      }
    });
  };

  private onTouchCancel = (e: TouchEvent): void => {
    Array.from(e.changedTouches).forEach((t) => {
      const timer = this.holdTimers.get(t.identifier);
      if (timer) { clearTimeout(timer); this.holdTimers.delete(t.identifier); }
      this.touchStartPos.delete(t.identifier);
    });
  };

  onTap(cb: InputCallback<TouchPoint>): () => void {
    this.tapCallbacks.add(cb);
    return () => this.tapCallbacks.delete(cb);
  }

  onSwipe(cb: InputCallback<SwipeEvent>): () => void {
    this.swipeCallbacks.add(cb);
    return () => this.swipeCallbacks.delete(cb);
  }

  onHold(cb: InputCallback<TouchPoint>): () => void {
    this.holdCallbacks.add(cb);
    return () => this.holdCallbacks.delete(cb);
  }

  destroy(): void {
    this.element.removeEventListener('touchstart', this.onTouchStart);
    this.element.removeEventListener('touchend', this.onTouchEnd);
    this.element.removeEventListener('touchcancel', this.onTouchCancel);
    this.holdTimers.forEach((t) => clearTimeout(t));
    this.tapCallbacks.clear();
    this.swipeCallbacks.clear();
    this.holdCallbacks.clear();
  }
}
