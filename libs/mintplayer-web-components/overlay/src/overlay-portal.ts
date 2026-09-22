/**
 * A document-root overlay container, in the spirit of `@angular/cdk/overlay`'s
 * `OverlayContainer` — the DOM-ownership half that `OverlayController` has
 * deliberately never had. The controller positions; this owns where the panel
 * lives. They compose, and either works without the other.
 *
 * ## Why a panel would leave its own subtree
 *
 * A panel rendered in place is clipped by any `overflow: auto` ancestor and
 * stacked against whatever `z-index` its neighbours happen to use. The house
 * answer so far has been `position: fixed` plus a hand-picked `z-index` per
 * component, which holds only while **no ancestor establishes a fixed
 * containing block**. That rule is enforced by comments, and it is unenforceable
 * outright when the ancestors belong to a consumer's application — as they do
 * for a light-DOM component such as `mp-datatable`.
 *
 * Moving the panel to a container that is the last child of `<body>` removes
 * both problems at once: nothing clips it, and panes stack in DOM order rather
 * than by a number each component invented on its own.
 *
 * ## The invariant this file exists to protect
 *
 * **The container must never establish a containing block.** No `transform`,
 * `filter`, `backdrop-filter`, `perspective`, `contain`, `will-change` or
 * `container-type`. Any of those would make it the containing block for the
 * `position: fixed` panes inside it, and every panel's viewport coordinates —
 * written by `OverlayController` from `getBoundingClientRect()` — would be
 * silently wrong. This is the one ancestor we control; `overlay-portal.spec.ts`
 * asserts the computed style so a later edit cannot quietly reintroduce the trap.
 *
 * Measured (Chromium 151, Firefox 153, WebKit 26.5): with these styles a
 * `position: fixed` child of a pane resolves against the viewport at exactly
 * (0, 0), and 20 acquire/release cycles leave no orphaned nodes.
 */

const CONTAINER_TAG = 'mp-overlay-container';
const PANE_CLASS = 'mp-overlay-pane';

/**
 * Sits above every z-index the library currently hands out (1050 for most
 * popups, 1056 for tree-select, 1080 for the file-manager context menu).
 * A consumer whose own chrome outranks it can raise it with
 * `--mp-overlay-container-z-index`; a portal cannot win against arbitrary page
 * CSS and does not pretend to.
 */
const CONTAINER_Z_INDEX = 2000;

const CONTAINER_STYLE = [
  'position: fixed',
  'inset: 0',
  // The container spans the viewport, so it must not intercept anything. Panes
  // opt back in individually.
  'pointer-events: none',
  `z-index: var(--mp-overlay-container-z-index, ${CONTAINER_Z_INDEX})`,
  'display: block',
].join('; ');

const PANE_STYLE = ['position: fixed', 'pointer-events: auto'].join('; ');

/** A single pane inside the shared container. Release it when the panel closes. */
export interface PortalHandle {
  /** The element to render the panel into. Positioned by `OverlayController`. */
  readonly container: HTMLElement;
  /** Removes the pane, and the shared container with it when this was the last one. */
  release(): void;
}

let containerEl: HTMLElement | null = null;
let paneCount = 0;

function defineContainerElement(): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(CONTAINER_TAG)) return;
  // A real custom element rather than a <div class="...">: it is greppable,
  // obvious in devtools, and stylable by tag without publishing a class name
  // as API.
  customElements.define(CONTAINER_TAG, class MpOverlayContainer extends HTMLElement {});
}

function ensureContainer(): HTMLElement {
  if (containerEl?.isConnected) return containerEl;

  defineContainerElement();
  const el = document.createElement(CONTAINER_TAG);
  el.setAttribute('style', CONTAINER_STYLE);
  // Last child of <body> so panes stack above the page without anyone choosing
  // a number.
  document.body.appendChild(el);
  containerEl = el;
  return el;
}

/**
 * Acquires a pane in the shared document-root container.
 *
 * Returns `null` during SSR, where there is no document to attach to; callers
 * fall back to rendering in place, which is correct for a non-interactive
 * server render.
 */
export function acquirePortal(): PortalHandle | null {
  if (typeof document === 'undefined' || !document.body) return null;

  const container = ensureContainer();
  const pane = document.createElement('div');
  pane.className = PANE_CLASS;
  pane.setAttribute('style', PANE_STYLE);
  container.appendChild(pane);
  paneCount++;

  let released = false;
  return {
    container: pane,
    release() {
      // Idempotent: a controller may release on both close() and
      // hostDisconnected(), and double-counting would strand the container.
      if (released) return;
      released = true;

      pane.remove();
      paneCount = Math.max(0, paneCount - 1);
      if (paneCount === 0 && containerEl) {
        containerEl.remove();
        containerEl = null;
      }
    },
  };
}

/** Test seam: the live container, or null when nothing is open. */
export function currentOverlayContainer(): HTMLElement | null {
  return containerEl?.isConnected ? containerEl : null;
}

/** Test seam. */
export function openPaneCount(): number {
  return paneCount;
}
