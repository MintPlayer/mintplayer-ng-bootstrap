import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Where focus ended up after `restore()`. Callers rarely branch on this; tests do.
 *
 * - `unchanged` — nothing was captured, so nothing moved (focus was outside the root)
 * - `same`      — the captured node survived the rebuild and holds focus again
 * - `neighbour` — the captured node is gone; the item at the same index has focus
 * - `container` — nothing restorable survived; the container holds focus
 * - `none`      — no root, or nothing focusable at all
 */
export type FocusRestoreOutcome = 'unchanged' | 'same' | 'neighbour' | 'container' | 'none';

export interface FocusRestoreOptions {
  /** Selector matching every restorable node, in document order. */
  selector: string;
  /**
   * Stable identity that survives the rebuild. Defaults to
   * `el.id || el.dataset.focusKey`. Return null to exclude a node.
   */
  keyOf?: (el: HTMLElement) => string | null;
  /**
   * Focusable last resort when no candidate survives. `tabindex="-1"` is
   * enough, and is applied automatically if absent. Defaults to the root's
   * first element child.
   */
  container?: () => HTMLElement | null;
  /** Human-readable name of a node, used only in the fallback announcement. */
  nameOf?: (el: HTMLElement) => string;
  /**
   * Wire to `LiveAnnouncerController.announce`. Called **only** on the
   * fallback paths — never when the captured node survived, because an
   * announcement on every keystroke trains users to tune the region out.
   */
  announce?: (message: string) => void;
  /** Default true — a DOM rebuild is not a navigation and must not scroll. */
  preventScroll?: boolean;
}

interface Snapshot {
  key: string;
  index: number;
}

/**
 * Resolve the truly focused element through any number of nested shadow roots.
 * `document.activeElement` stops at the outermost custom element, so a button
 * inside a nested web component's shadow root is invisible without this.
 */
export function deepActiveElement(from: Document | ShadowRoot = document): Element | null {
  let el: Element | null = from.activeElement;
  while (el?.shadowRoot?.activeElement) {
    el = el.shadowRoot.activeElement;
  }
  return el;
}

/**
 * Keeps keyboard focus continuous across an imperative DOM rebuild.
 *
 * Components that render by clearing a container (`innerHTML = ''`,
 * `replaceChildren()`) destroy the element that currently has focus, which
 * drops focus to `<body>` — the user loses their place in the page entirely
 * and their next keystroke goes nowhere. `capture()` before the rebuild and
 * `restore()` after re-focuses the same *logical* item, identified by a stable
 * key rather than by DOM identity or index.
 *
 * Deliberately **not** a Lit `ReactiveController` at its core, unlike
 * `LiveAnnouncerController`: three of the four call sites rebuild from plain
 * non-Lit classes (a scheduler view has no host reference), so the core is a
 * bare object and `FocusRestoreController` is thin sugar over it.
 *
 * Three properties are load-bearing and are the reason this exists as a shared
 * primitive rather than a snippet:
 *
 * 1. **Capture is scoped.** It records nothing unless focus is already inside
 *    the root. Without that test, a rebuild triggered by an unrelated data
 *    change would *steal* focus from elsewhere on the page — worse than the
 *    bug being fixed.
 * 2. **Restore is synchronous.** After `replaceChildren()` the new nodes are
 *    already focusable; deferring to `requestAnimationFrame` leaves a frame in
 *    which focus genuinely sits on `<body>`. The one case that needs deferral
 *    — a nested custom element that has not upgraded yet — gets a single
 *    bounded `queueMicrotask` retry, never a loop.
 * 3. **Announcements only on fallback.** Surviving the rebuild is the normal
 *    case and must be silent.
 *
 * This is a safety net, not a licence: preferring to reposition existing nodes
 * over destroying and recreating them is still the better fix where possible.
 */
export class FocusRestore {
  private snapshot: Snapshot | null = null;
  private retried = false;

  constructor(
    private readonly root: () => ShadowRoot | HTMLElement | null,
    private readonly options: FocusRestoreOptions,
  ) {}

  /** Snapshot the focused item's key and index. No-op unless focus is inside the root. */
  capture(): void {
    this.snapshot = null;
    this.retried = false;

    const root = this.root();
    if (!root) return;

    const inner = this.activeInsideRoot(root);
    if (!inner) return;

    // The focused node may itself live inside a nested component's shadow root
    // (a dock tab button lives inside <mp-tab-control>), so walk down again.
    const focused = (inner.shadowRoot ? deepActiveElement(inner.shadowRoot) : inner) as HTMLElement | null;
    if (!focused) return;

    // Slotted light-DOM content is not destroyed by a shadow-root rebuild, so
    // recording it would mean re-focusing a node that never moved.
    if (focused.assignedSlot) return;

    const list = this.candidates();
    const key = this.resolveKey(focused);
    if (key === null) return;

    const index = list.indexOf(focused);
    this.snapshot = { key, index: index < 0 ? 0 : index };
  }

  /** Re-focus after the rebuild. Safe to call with nothing captured. */
  restore(): FocusRestoreOutcome {
    const snap = this.snapshot;
    if (!snap) return 'unchanged';

    const root = this.root();
    if (!root) {
      this.snapshot = null;
      return 'none';
    }

    const list = this.candidates();
    const focusOptions: FocusOptions = { preventScroll: this.options.preventScroll ?? true };

    const exact = list.find((el) => this.resolveKey(el) === snap.key);
    if (exact) {
      if (!this.tryFocus(exact, focusOptions) && !this.retried) {
        // A nested custom element may not have upgraded yet, so it has nothing
        // focusable inside. Retry once, then give up rather than spin.
        this.retried = true;
        queueMicrotask(() => this.restore());
        return 'same';
      }
      this.snapshot = null;
      return 'same';
    }

    // The captured item is gone — a pane closed, a chip removed, a row
    // filtered out. Clamp to the same position and say so, because the user's
    // target vanished and silence would be indistinguishable from success.
    if (list.length > 0) {
      const next = list[Math.min(snap.index, list.length - 1)];
      this.tryFocus(next, focusOptions);
      this.options.announce?.(`${this.options.nameOf?.(next) ?? 'Item'} focused.`);
      this.snapshot = null;
      return 'neighbour';
    }

    const container = this.options.container?.() ?? (root.firstElementChild as HTMLElement | null);
    if (container) {
      if (!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '-1');
      this.tryFocus(container, focusOptions);
      this.options.announce?.('Nothing left to focus.');
      this.snapshot = null;
      return 'container';
    }

    this.snapshot = null;
    return 'none';
  }

  /** `capture()` → `rebuild()` → `restore()`. The shape most call sites want. */
  around<T>(rebuild: () => T): T {
    this.capture();
    try {
      return rebuild();
    } finally {
      this.restore();
    }
  }

  private candidates(): HTMLElement[] {
    const root = this.root();
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(this.options.selector));
  }

  private resolveKey(el: HTMLElement): string | null {
    if (this.options.keyOf) return this.options.keyOf(el);
    return el.id || el.dataset['focusKey'] || null;
  }

  /**
   * The focused element within `root`, or null when focus is elsewhere.
   *
   * For a ShadowRoot this is exactly `activeElement`, which is null unless
   * focus is inside that root — both the cheap check and the correctness
   * guarantee. A plain element root has no such property, so fall back to a
   * containment test against the deep active element.
   */
  private activeInsideRoot(root: ShadowRoot | HTMLElement): Element | null {
    if (root instanceof HTMLElement) {
      const active = deepActiveElement();
      return active && root.contains(active) ? active : null;
    }
    return root.activeElement;
  }

  private tryFocus(el: HTMLElement, options: FocusOptions): boolean {
    el.focus(options);
    const active = deepActiveElement();
    return active === el || (active !== null && el.contains(active));
  }
}

/**
 * Lit sugar for hosts whose rebuild happens inside Lit's own update cycle
 * (a `lit-html` re-render rather than a manual `innerHTML` wipe). Captures
 * before Lit commits DOM and restores immediately after, so no
 * `requestAnimationFrame` is involved.
 *
 * Composes with `LiveAnnouncerController` by construction — pass
 * `announce: (m) => this.liveAnnouncer.announce(m)` in the options. Neither
 * class imports the other.
 */
export class FocusRestoreController implements ReactiveController {
  constructor(
    host: ReactiveControllerHost,
    private readonly inner: FocusRestore,
  ) {
    host.addController(this);
  }

  hostUpdate(): void {
    this.inner.capture();
  }

  hostUpdated(): void {
    this.inner.restore();
  }
}
