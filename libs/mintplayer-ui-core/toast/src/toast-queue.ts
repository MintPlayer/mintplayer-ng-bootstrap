import { Machine } from '@mintplayer/ui-core/store';

/**
 * The framework-neutral toast queue (#458 M6): the imperative half of the
 * toast. Every front's toaster renders one; `push` and `close` are the whole
 * API, so an Angular service, a React context or a plain module can own it.
 *
 *   const toasts = new ToastQueue<{ message: string }>();
 *   toasts.push({ message: 'Saved' });                  // returns the toast's id
 *   <bs-toaster [queue]="toasts"> … one template per toast, given the entry … </bs-toaster>
 *
 * A pushed toast enters hidden and turns visible a moment later, so its toast
 * animates in and announces itself; `close` hides it and drops it once it has
 * faded out. `autohide` (ms, default 5000; `false` keeps it) closes it on a
 * timer that `hold` pauses while the user points at or focuses the toasts
 * (WCAG 2.2.1), and `release` restarts.
 */
export interface ToastEntry<T> {
  readonly id: string;
  readonly data: T;
  /** Bind to the toast's `visible`. */
  readonly visible: boolean;
}

/**
 * What the toaster reads from a queue: any `ToastQueue<T>` is one. Structural, so a
 * typed queue binds to the toaster's `queue` input (a `ToastQueue<T>` is invariant in T).
 */
export interface ToastSource {
  readonly toasts: readonly ToastEntry<unknown>[];
  subscribe(listener: (state: { readonly toasts: readonly ToastEntry<unknown>[] }) => void): () => void;
  hold(): void;
  release(): void;
}

export interface ToastPushOptions {
  /** ms until it closes itself; `false` keeps it until closed. Default 5000. */
  autohide?: number | false;
}

export interface ToastQueueState<T> {
  readonly toasts: readonly ToastEntry<T>[];
}

/** Bootstrap's toast fade (0.15s), plus a margin: when a closed toast leaves the queue. */
export const TOAST_REMOVE_MS: number = 200;
/** How long a pushed toast stays hidden first, so it renders once before it shows. */
const ENTER_DELAY_MS = 20;
const DEFAULT_AUTOHIDE_MS = 5000;

export class ToastQueue<T = unknown> extends Machine<ToastQueueState<T>> {
  #next = 0;
  #held = false;
  readonly #autohide = new Map<string, number>();
  readonly #timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    super({ toasts: [] });
  }

  get toasts(): readonly ToastEntry<T>[] {
    return this.snapshot.toasts;
  }

  push(data: T, options: ToastPushOptions = {}): string {
    const id = `mp-toast-${++this.#next}`;
    const autohide = options.autohide ?? DEFAULT_AUTOHIDE_MS;
    if (autohide !== false) this.#autohide.set(id, autohide);
    this.update({ toasts: [...this.snapshot.toasts, { id, data, visible: false }] });
    this.#timers.set(
      id,
      setTimeout(() => {
        this.#patch(id, true);
        this.#arm(id);
      }, ENTER_DELAY_MS),
    );
    return id;
  }

  close(id: string): void {
    const entry = this.snapshot.toasts.find((t) => t.id === id);
    if (!entry) return;
    clearTimeout(this.#timers.get(id));
    this.#autohide.delete(id);
    this.#patch(id, false);
    this.#timers.set(
      id,
      setTimeout(() => {
        this.#timers.delete(id);
        this.update({ toasts: this.snapshot.toasts.filter((t) => t.id !== id) });
      }, TOAST_REMOVE_MS),
    );
  }

  /** Pause every autohide timer (pointer or focus inside the toasts). */
  hold(): void {
    if (this.#held) return;
    this.#held = true;
    [...this.#autohide.keys()].map((id) => clearTimeout(this.#timers.get(id)));
  }

  /** Restart the autohide timers, each from its full delay. */
  release(): void {
    if (!this.#held) return;
    this.#held = false;
    this.snapshot.toasts.filter((t) => t.visible).map((t) => this.#arm(t.id));
  }

  clear(): void {
    this.snapshot.toasts.map((t) => this.close(t.id));
  }

  override destroy(): void {
    [...this.#timers.values()].map((timer) => clearTimeout(timer));
    this.#timers.clear();
    this.#autohide.clear();
    super.destroy();
  }

  #arm(id: string): void {
    const ms = this.#autohide.get(id);
    if (ms === undefined || this.#held) return;
    clearTimeout(this.#timers.get(id));
    this.#timers.set(id, setTimeout(() => this.close(id), ms));
  }

  #patch(id: string, visible: boolean): void {
    this.update({ toasts: this.snapshot.toasts.map((t) => (t.id === id ? { ...t, visible } : t)) });
  }
}
