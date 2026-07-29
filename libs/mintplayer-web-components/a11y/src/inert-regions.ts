import { deepActiveElement } from './focus-restore';

/**
 * Keeps a set of regions hidden from **both** the accessibility tree and the
 * tab order, so `aria-hidden` and focusability can never disagree.
 *
 * The defect this exists to prevent: hiding a region with `aria-hidden="true"`
 * while it stays in the layout (translated off-screen, `opacity: 0`, clipped)
 * leaves its controls focusable. Tab then lands on a node the screen reader is
 * required *not* to announce — the reader goes silent and focus is effectively
 * lost. It is an outright authoring violation, and it is easy to introduce
 * because the two attributes are written in different places.
 *
 * Callers declare the **complete current hidden set**, never deltas. An
 * interrupted animation therefore cannot leave a stale `inert` behind: the next
 * declaration is authoritative regardless of what the previous transition was
 * doing.
 *
 * Note `inert` propagates down the **flat tree**, so marking a shadow-DOM
 * wrapper inert also inerts the consumer's light-DOM content slotted into it.
 * A hand-rolled `tabindex="-1"` sweep cannot reach across a slot boundary
 * without walking assigned nodes, which is the main reason this uses `inert`.
 *
 * `visibility: hidden` in CSS achieves the same thing and is preferable where
 * the hiding is purely declarative (see the collapsing-region rule in
 * `CLAUDE.md`); this is for the JS-driven cases and for defence in depth.
 */
export interface InertRegions {
  /** Declare the complete set that should be hidden right now. Idempotent. */
  setHidden(hidden: Iterable<Element>): void;
  /**
   * Nothing is hidden while suspended. Reference-counted, because overlapping
   * transitions are real — a carousel can start a drag while a wrap teleport
   * is still in flight. Pair with `resume()`.
   */
  suspend(): void;
  resume(): void;
  /** Clear every attribute this controller wrote. */
  dispose(): void;
}

/**
 * Why `suspend()`/`resume()` exists rather than callers just recomputing the
 * set: during a transition **both** the outgoing and the incoming region must
 * be non-inert. Inert the outgoing one too early and it vanishes from the
 * accessibility tree mid-animation; inert the incoming one too late and it is
 * still inert when it lands. Suspending wholesale is simpler and strictly safer
 * than computing the union, and it generalises — every animated panel has
 * exactly this requirement.
 *
 * A zero-duration transition needs no special case: `suspend()` immediately
 * followed by `resume()` writes the same attributes twice, which is idempotent.
 * So the `prefers-reduced-motion` path requires no branch.
 */
export function inertRegions(): InertRegions {
  /** Elements this controller has written to, so dispose() can clean up exactly. */
  const owned = new Set<Element>();
  let declared: Element[] = [];
  let suspendCount = 0;

  const hide = (el: Element): void => {
    // Focus rescue first. Applying `inert` to an ancestor of the focused
    // element blurs it to <body> — trading the "silent focus" bug for the
    // "lost focus" bug. Move focus out deliberately instead.
    const active = deepActiveElement();
    if (active && (el === active || el.contains(active))) {
      const fallback = nearestFocusableOutside(el);
      if (fallback) fallback.focus({ preventScroll: true });
      else if (active instanceof HTMLElement) active.blur();
    }

    el.setAttribute('inert', '');
    // `inert` covers AT exposure in current engines; `aria-hidden` is the
    // wider-support belt and what existing specs assert. Because one function
    // owns both, they cannot desync — which is the entire bug class.
    el.setAttribute('aria-hidden', 'true');
    owned.add(el);
  };

  const show = (el: Element): void => {
    el.removeAttribute('inert');
    el.removeAttribute('aria-hidden');
  };

  const apply = (): void => {
    const target = suspendCount > 0 ? new Set<Element>() : new Set(declared);

    for (const el of owned) {
      if (!target.has(el)) {
        show(el);
        owned.delete(el);
      }
    }
    for (const el of target) {
      if (!owned.has(el)) hide(el);
    }
  };

  return {
    setHidden(hidden: Iterable<Element>): void {
      declared = Array.from(hidden);
      apply();
    },
    suspend(): void {
      suspendCount += 1;
      if (suspendCount === 1) apply();
    },
    resume(): void {
      if (suspendCount === 0) return;
      suspendCount -= 1;
      // Re-applies from the last *declared* state, not from whatever the
      // animation was doing, so a cancelled transition self-heals.
      if (suspendCount === 0) apply();
    },
    dispose(): void {
      for (const el of owned) show(el);
      owned.clear();
      declared = [];
      suspendCount = 0;
    },
  };
}

/**
 * Nearest focusable element outside the subtree being hidden, preferring an
 * ancestor so focus stays near where the user was.
 */
function nearestFocusableOutside(el: Element): HTMLElement | null {
  let parent = el.parentElement;
  while (parent) {
    if (parent.tabIndex >= 0) return parent;
    parent = parent.parentElement;
  }
  const root = el.getRootNode();
  const host = root instanceof ShadowRoot ? root.host : null;
  return host instanceof HTMLElement && host.tabIndex >= 0 ? host : null;
}
