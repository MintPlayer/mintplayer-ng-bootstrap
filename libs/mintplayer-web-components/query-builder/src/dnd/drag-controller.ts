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
   * The one hit-test seam: every element under (x, y), topmost first.
   * `document.elementsFromPoint` (evergreen: Chromium, Firefox, WebKit 11.1+)
   * stops at a shadow host, so the chain is extended one level into the
   * shadow root of any host it contains — the builder may itself live inside
   * another component's shadow root. Specs stub this method to say which
   * element is under the pointer; they never fake geometry.
   */
  private elementsAt(x: number, y: number): Element[] {
    return expandShadowChain(document.elementsFromPoint(x, y), x, y);
  }

  /**
   * Returns the first `[data-drop-slot]` under the pointer (or its ancestor)
   * that carries a complete target and whose data-parent-id is NOT in the
   * source's descendant set (cycle prevention).
   */
  private resolveDropTarget(x: number, y: number): DropTarget | null {
    const source = this._source;
    if (!source) return null;
    const targets = this.elementsAt(x, y)
      .map((el) => el.closest('[data-drop-slot]') as HTMLElement | null)
      .map((slot) => slot && {
        parentId: slot.dataset['parentId'],
        index: slot.dataset['index'],
        qbRoot: slot.dataset['qbRoot'],
      });
    const hit = targets.find((t) => !!t && !!t.parentId && !!t.index && !!t.qbRoot
      && !source.descendantIds.has(t.parentId));
    return hit ? { parentId: hit.parentId!, index: Number(hit.index), qbRoot: hit.qbRoot! } : null;
  }
}

function expandShadowChain(chain: Element[], x: number, y: number): Element[] {
  const inner = [...new Set(chain.map((el) => el.shadowRoot).filter((s): s is ShadowRoot => !!s))]
    .map((shadow) => shadow.elementFromPoint(x, y))
    .filter((el): el is Element => !!el);
  return [...chain, ...inner];
}
