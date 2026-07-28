/**
 * The document's single LIFO registry of dismissible layers, so exactly one
 * overlay consumes each Escape press.
 *
 * Every overlay binds some form of global Escape handler that closes it. With
 * nesting — a popover inside a modal, a tree-select panel inside a dialog — a
 * single Escape closes both, because both handlers see the same event.
 *
 * The fix is that every layer pushes a frame when it opens, releases it when it
 * closes, and runs its Escape handler only while `isTop(token)` is true.
 *
 * **Why this lives here and not in either overlay implementation.** The
 * workspace previously had *two* of these: `BsOverlayStackService` (Angular,
 * DI-scoped) and a private static inside `OverlayController` (web components).
 * Neither knew about the other, so an Angular overlay wrapping a web-component
 * overlay had one frame on each stack, both believed they were top-most, and a
 * single Escape unwound both — reintroducing the exact bug the Angular stack
 * was written to prevent. A document-scoped module singleton is the only place
 * both layers can agree on, so this is the one source of truth and both of
 * those become thin facades over it.
 *
 * Identity is a per-call `symbol` rather than a string, so two opens of the
 * same component cannot collide and a stale token cannot match a future frame.
 *
 * **What this does not promise:**
 * - **Visual z-order.** The stack tracks logical open order. A consumer that
 *   reorders overlays in the DOM could see Escape close a logically deeper one.
 * - **Coordination with handlers that do not ask.** A consumer's own Escape
 *   listener that never calls `isTop` still fires.
 */
const stack: symbol[] = [];

/** Allocate a frame on top of the stack. Pair every push with a release. */
export function push(description = 'dismiss-frame'): symbol {
  const token = Symbol(description);
  stack.push(token);
  return token;
}

/**
 * Remove `token`. Releasing a non-top token is allowed and intentional — it is
 * how an inner layer closes itself programmatically without an Escape press
 * (a popover dismissed by clicking its trigger again).
 */
export function release(token: symbol): void {
  const index = stack.lastIndexOf(token);
  if (index >= 0) stack.splice(index, 1);
}

/** True while `token` is the top-most frame. */
export function isTop(token: symbol): boolean {
  return stack.length > 0 && stack[stack.length - 1] === token;
}

/** Top-most token, or null when nothing is open. */
export function peek(): symbol | null {
  return stack.length > 0 ? stack[stack.length - 1] : null;
}

/** Number of open frames. Exposed for tests and diagnostics. */
export function depth(): number {
  return stack.length;
}

/** Drop every frame. Tests only — never call this from component code. */
export function resetForTesting(): void {
  stack.length = 0;
}

/** Namespaced access, for call sites that prefer one import. */
export const dismissStack = { push, release, isTop, peek, depth, resetForTesting };
