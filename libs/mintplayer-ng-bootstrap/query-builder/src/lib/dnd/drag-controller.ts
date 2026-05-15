/**
 * Pointer-events drag controller for mp-query-builder.
 *
 * Lifecycle:
 *   1. `start(sourceId, descendantIds, event)` — called on a handle's
 *      pointerdown. Records source identity, descendant set for cycle
 *      prevention, and the source row's DOMRect. Creates a ghost element
 *      cloning the row, attaches it to `document.body` at `position: fixed`,
 *      `pointer-events: none`, and a high z-index.
 *
 *   2. `move(event)` — pointer move. Translates the ghost. Resolves the
 *      drop target by walking `document.elementsFromPoint(clientX, clientY)`
 *      for any `[data-drop-slot]`. If the slot's `data-parent-id` is in
 *      the source's descendant set, the target is rejected (cycle
 *      prevention). The latest valid target is held until `end`.
 *
 *   3. `end(event)` — pointer up. Returns the resolved target descriptor
 *      (or null if none). Caller dispatches `move-node` from the WC.
 *
 *   4. `cancel()` — pointer cancel OR mid-drag tree mutation. Cleans up
 *      ghost + state without returning a target.
 *
 * The controller is SSR-safe: all `document.body` access is gated on
 * `typeof document !== 'undefined'` (per dock precedent).
 */

export interface DropTarget {
  /** Group id this slot inserts into. */
  parentId: string;
  /** Insertion index within the parent's children array. */
  index: number;
  /** The mp-query-builder root that owns this slot (cross-tree DnD). */
  qbRoot: string;
}

export interface DragSource {
  /** Node id being dragged. */
  id: string;
  /** Set of `id` values of this node and all its descendants (cycle guard). */
  descendantIds: Set<string>;
  /** The mp-query-builder root the source belongs to. */
  qbRoot: string;
  /** The source row element (cloned into the ghost). */
  rowElement: HTMLElement;
}

const GHOST_Z_INDEX = 99999;

export class DragController {
  private _source: DragSource | null = null;
  private _ghost: HTMLElement | null = null;
  private _lastTarget: DropTarget | null = null;
  private _offsetX = 0;
  private _offsetY = 0;

  isActive(): boolean { return this._source !== null; }
  source(): DragSource | null { return this._source; }
  currentTarget(): DropTarget | null { return this._lastTarget; }

  start(source: DragSource, event: PointerEvent): void {
    if (typeof document === 'undefined') return;
    this._source = source;
    const rect = source.rowElement.getBoundingClientRect();
    this._offsetX = event.clientX - rect.left;
    this._offsetY = event.clientY - rect.top;

    const ghost = source.rowElement.cloneNode(true) as HTMLElement;
    ghost.style.position = 'fixed';
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.width = `${rect.width}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = String(GHOST_Z_INDEX);
    ghost.style.opacity = '0.85';
    ghost.classList.add('qb-drag-ghost');
    document.body.appendChild(ghost);
    this._ghost = ghost;
  }

  move(event: PointerEvent): void {
    if (!this._source || !this._ghost) return;
    this._ghost.style.top = `${event.clientY - this._offsetY}px`;
    this._ghost.style.left = `${event.clientX - this._offsetX}px`;

    const target = this.resolveDropTarget(event.clientX, event.clientY);
    this._lastTarget = target;
  }

  end(_event: PointerEvent): DropTarget | null {
    const target = this._lastTarget;
    this.cleanup();
    return target;
  }

  cancel(): void {
    this.cleanup();
  }

  private cleanup(): void {
    if (this._ghost && typeof document !== 'undefined') {
      this._ghost.remove();
    }
    this._ghost = null;
    this._source = null;
    this._lastTarget = null;
    this._offsetX = 0;
    this._offsetY = 0;
  }

  /**
   * Walks `document.elementsFromPoint(x, y)` (composed path; cross-browser
   * supported in Chromium / Firefox / modern WebKit) and returns the first
   * `[data-drop-slot]` ancestor whose data-parent-id is NOT in the source's
   * descendant set.
   *
   * For older WebKit which doesn't implement `elementsFromPoint`, callers
   * can extend the resolver with a shadow-DOM walker (FR-38 fallback) —
   * not implemented here since we target evergreen browsers.
   */
  private resolveDropTarget(x: number, y: number): DropTarget | null {
    if (typeof document === 'undefined') return null;
    const source = this._source;
    if (!source) return null;

    const elementsFromPoint = (document as Document & { elementsFromPoint?: (x: number, y: number) => Element[] }).elementsFromPoint;
    let chain: Element[] = [];
    if (typeof elementsFromPoint === 'function') {
      chain = elementsFromPoint.call(document, x, y) ?? [];
    } else {
      const el = document.elementFromPoint(x, y);
      if (el) chain = [el];
    }

    // Also walk into shadow roots of mp-query-builder hosts that overlap the
    // point — needed because elementsFromPoint can stop at a closed/open
    // shadow boundary depending on the browser. We descend through any
    // [data-qb-root] host's shadow root.
    const expanded = expandShadowChain(chain, x, y);

    for (const el of expanded) {
      const slot = el.closest('[data-drop-slot]') as HTMLElement | null;
      if (!slot) continue;
      const parentId = slot.dataset['parentId'];
      const indexAttr = slot.dataset['index'];
      const qbRoot = slot.dataset['qbRoot'];
      if (!parentId || !indexAttr || !qbRoot) continue;
      if (source.descendantIds.has(parentId)) continue; // cycle: drop into self/descendant
      return { parentId, index: Number(indexAttr), qbRoot };
    }
    return null;
  }
}

function expandShadowChain(chain: Element[], x: number, y: number): Element[] {
  const out: Element[] = [...chain];
  const visited = new Set<ShadowRoot>();
  for (const el of chain) {
    const shadow = (el as Element & { shadowRoot?: ShadowRoot }).shadowRoot;
    if (!shadow || visited.has(shadow)) continue;
    visited.add(shadow);
    const inner = shadow.elementFromPoint(x, y);
    if (inner) out.push(inner);
  }
  return out;
}
