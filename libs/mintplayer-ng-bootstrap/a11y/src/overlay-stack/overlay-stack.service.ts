import { Injectable } from '@angular/core';

/**
 * LIFO registry that tracks open overlays so each overlay can decide whether
 * its global Escape listener should fire.
 *
 * The problem: popover, tooltip, dropdown-menu, priority-nav, and modal each
 * bind a `(document:keydown.escape)` (or equivalent host listener) that closes
 * the overlay unconditionally. With nesting (popover-under-modal,
 * tooltip-under-popover), a single Escape closes both because both handlers
 * fire on the same event.
 *
 * The fix: every overlay calls `push()` when it opens and `release(token)`
 * when it closes; its Escape handler runs only when `isTop(token)` returns
 * true. The top-most overlay consumes Escape; lower frames stay open.
 *
 * Identity is a per-call `symbol` token rather than a string, so two opens of
 * the same directive don't collide and a stale token can't accidentally match
 * a future frame.
 *
 * **What this does NOT promise:**
 * - **Visual z-order.** The stack tracks logical open-order (the sequence of
 *   `push()` calls). A consumer that manually reorders overlays in the DOM
 *   could see Escape close a logically-deeper overlay. We don't support that.
 * - **Coordination with non-overlay listeners.** A consumer's own
 *   `keydown.escape` listener that doesn't ask the stack will still fire.
 */
@Injectable({ providedIn: 'root' })
export class BsOverlayStackService {
  private stack: symbol[] = [];

  /** Allocate a new frame on top of the stack and return its token. */
  push(): symbol {
    const token = Symbol('bs-overlay-frame');
    this.stack.push(token);
    return token;
  }

  /**
   * Remove `token` from the stack. Releasing a non-top token is allowed —
   * it's how an inner overlay closes itself programmatically without an
   * Escape press (e.g. a popover closed by clicking its trigger again).
   */
  release(token: symbol): void {
    const idx = this.stack.lastIndexOf(token);
    if (idx >= 0) this.stack.splice(idx, 1);
  }

  /** True if `token` is the top of the stack. */
  isTop(token: symbol): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === token;
  }

  /** Token at the top of the stack, or null if empty. */
  peek(): symbol | null {
    return this.stack.length > 0 ? this.stack[this.stack.length - 1] : null;
  }
}
