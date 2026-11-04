import { defineCore, type CoreBag } from '@mintplayer/ui-core/component';

/**
 * A table of contents that follows the reader (#458 M7).
 *
 *   <div class="scrollspy" data-scrollspy-root [data-contained]>
 *     <nav class="spy" aria-label=<label>>
 *       <ul class="text-muted">
 *         <li><button type=button class="btn btn-link … scrollspy-level-2 [fw-bold]"
 *                     data-scrollspy-index=0 [aria-current=location]>Section A</button></li>
 *       </ul>
 *     </nav>
 *     <div class="scrollspy-content">…content…</div>
 *   </div>
 *
 * The sections are the content's elements marked `data-scrollspy` (plain markup, the
 * same in every framework); a nested scrollspy keeps its own. The entry's level is
 * the heading's (`<h3>` indents one step further than `<h2>`).
 *
 * The scroll target is `scrollContainer`, else the nearest ancestor (the host
 * included) whose `overflow-y` is `auto` or `scroll`, else the window. Against the
 * window the trigger line sits `offset` pixels below the viewport top (a fixed
 * navbar's height; Angular reads the router's `scrollOffset`). Inside a container
 * the root is marked `data-contained`, so the sticky list anchors to the
 * container's top instead.
 *
 * No-JS tier 2: the content renders and reads normally; the list is built from the
 * DOM once hydrated (its entries scroll with JS, so there is nothing to show
 * before). The active entry is `aria-current="location"`, not just bold.
 */
export interface ScrollspyInputs {
  /** Names the section navigation. A consumer `aria-label` wins. Override to translate. */
  label: string;
  /** The element that scrolls; null finds the nearest scrolling ancestor, else the window. */
  scrollContainer: HTMLElement | null;
  /** Pixels between the viewport top and the trigger line when the window scrolls. */
  offset: number;
}

export interface ScrollspySection {
  readonly text: string;
  /** 2 for an `<h2>`, …; 0 for an element that is not a heading. */
  readonly level: number;
}

export interface ScrollspyState {
  sections: readonly ScrollspySection[];
  active: number;
  contained: boolean;
}

export interface ScrollspyEntry {
  readonly key: number;
  readonly button: CoreBag;
  readonly text: string;
}

export interface ScrollspyView {
  readonly root: CoreBag;
  readonly nav: CoreBag;
  readonly list: CoreBag;
  readonly entries: readonly ScrollspyEntry[];
  readonly content: CoreBag;
}

export const SCROLLSPY_SECTION_ATTR = 'data-scrollspy';
export const SCROLLSPY_ROOT_ATTR = 'data-scrollspy-root';
export const SCROLLSPY_INDEX_ATTR = 'data-scrollspy-index';

/** Below this viewport width the list is not sticky, so it is never scrolled to the active entry. */
const WIDE = 768;

/**
 * The section the reader is in: the last one whose top has passed the trigger line, or the
 * first when none has yet. -1 when there are no sections.
 */
export function activeSectionIndex(sectionTops: readonly number[], triggerY: number): number {
  if (sectionTops.length === 0) return -1;
  return sectionTops.reduce((active, top, index) => (top < triggerY ? index : active), 0);
}

/**
 * The scroll position that puts a section's top 1px past the trigger line. The extra pixel
 * makes the section count as passed (the trigger line is `originTop + 1`), so it becomes the
 * active one.
 *
 * @param headerTop the section's current top, in viewport coordinates
 * @param originTop where the trigger line sits: the container's top, or the fixed offset
 * @param currentScroll the scroll position now
 */
export function sectionScrollTop(headerTop: number, originTop: number, currentScroll: number): number {
  return headerTop - originTop + currentScroll + 1;
}

/** `H2` → 2; anything that is not a heading → 0. */
export function headingLevel(tagName: string): number {
  const match = /^H([1-6])$/i.exec(tagName);
  return match ? Number(match[1]) : 0;
}

export function connectScrollspy(inputs: ScrollspyInputs, state: ScrollspyState, consumerLabel: string | null = null): ScrollspyView {
  return {
    root: { class: 'scrollspy', [SCROLLSPY_ROOT_ATTR]: '', 'data-contained': state.contained ? '' : null },
    nav: { class: 'spy', 'aria-label': consumerLabel ?? inputs.label },
    list: { class: 'text-muted' },
    entries: state.sections.map((section, index) => ({
      key: index,
      text: section.text,
      button: {
        type: 'button',
        class: [
          'btn btn-link p-0 text-start text-decoration-none',
          `scrollspy-level-${section.level}`,
          index === state.active ? 'fw-bold' : '',
        ].filter(Boolean).join(' '),
        [SCROLLSPY_INDEX_ATTR]: String(index),
        'aria-current': index === state.active ? 'location' : null,
      },
    })),
    content: { class: 'scrollspy-content' },
  };
}

type ScrollTarget = HTMLElement | Window;

/** The host itself or its nearest ancestor that declares a vertical scroll. */
function scrollableAncestor(el: HTMLElement | null): HTMLElement | null {
  if (!el) return null;
  const overflowY = getComputedStyle(el).overflowY;
  return overflowY === 'auto' || overflowY === 'scroll' ? el : scrollableAncestor(el.parentElement);
}

const sameSections = (a: readonly ScrollspySection[], b: readonly ScrollspySection[]) =>
  a.length === b.length && a.every((section, i) => section.text === b[i].text && section.level === b[i].level);

/** Per attached host: re-read the scroll target after an input change. */
const refreshers = new WeakMap<HTMLElement, () => void>();

export const scrollspyCore = defineCore<ScrollspyInputs, ScrollspyState, { view: ScrollspyView }>({
  state: () => ({ sections: [], active: -1, contained: false }),
  view: ({ inputs, state, label }) => ({ view: connectScrollspy(inputs, state, label) }),
  attach: (api) => {
    const host = api.host;
    const doc = host.ownerDocument;
    const win = doc.defaultView ?? window;
    let elements: HTMLElement[] = [];

    // Resolved on every use, never cached: a scrollspy in an overlay attaches before its
    // container is scrollable (the modal body only scrolls once the modal is in the body host).
    const resolveTarget = (): ScrollTarget => api.inputs().scrollContainer ?? scrollableAncestor(host) ?? win;
    const isElement = (t: ScrollTarget): t is HTMLElement => t !== win;
    const triggerY = (target: ScrollTarget) => (isElement(target) ? target.getBoundingClientRect().top : api.inputs().offset) + 1;

    // The list scrolls itself only (never scrollIntoView, which scrolls the page too and,
    // run from the page's own scroll handler, pulled the window back).
    const revealActive = () => {
      if (win.innerWidth < WIDE) return;
      const nav = host.querySelector<HTMLElement>(':scope > .spy');
      const entry = host.querySelector<HTMLElement>(`:scope > .spy [${SCROLLSPY_INDEX_ATTR}="${api.state().active}"]`);
      if (!nav || !entry) return;
      const a = entry.getBoundingClientRect();
      const n = nav.getBoundingClientRect();
      if (a.top < n.top) nav.scrollTop += a.top - n.top;
      else if (a.bottom > n.bottom) nav.scrollTop += a.bottom - n.bottom;
    };

    const update = () => {
      const target = resolveTarget();
      const sections = elements.map((el) => ({ text: el.textContent?.trim() ?? '', level: headingLevel(el.tagName) }));
      const active = activeSectionIndex(elements.map((el) => el.getBoundingClientRect().top), triggerY(target));
      const state = api.state();
      const contained = isElement(target);
      if (active === state.active && contained === state.contained && sameSections(sections, state.sections)) return;
      api.setState({ sections: sameSections(sections, state.sections) ? state.sections : sections, active, contained });
      win.requestAnimationFrame(revealActive);
    };

    // A nested scrollspy's sections are its own.
    const scan = () => {
      elements = [...host.querySelectorAll<HTMLElement>(`[${SCROLLSPY_SECTION_ATTR}]`)]
        .filter((el) => el.closest(`[${SCROLLSPY_ROOT_ATTR}]`) === host);
      update();
    };

    // Scroll does not bubble, but every element's scroll reaches the document in the capture
    // phase: react to the page's or the current target's.
    const onScroll = (event: Event) => {
      const target = resolveTarget();
      if (event.target === (isElement(target) ? target : doc)) update();
    };
    // An enclosing overlay sliding in moves the sections without a scroll: measure again
    // when a transition or animation on an ancestor ends.
    const onSettle = (event: Event) => {
      if (event.target instanceof Node && event.target.contains(host)) update();
    };
    const settleOptions = { capture: true, passive: true };

    const onClick = (event: Event) => {
      const button = (event.target as Element | null)?.closest?.(`[${SCROLLSPY_INDEX_ATTR}]`);
      if (!button || !host.contains(button)) return;
      const section = elements[Number(button.getAttribute(SCROLLSPY_INDEX_ATTR))];
      if (!section) return;
      const target = resolveTarget();
      const top = section.getBoundingClientRect().top;
      if (isElement(target)) {
        target.scrollTo({ top: sectionScrollTop(top, target.getBoundingClientRect().top, target.scrollTop), behavior: 'smooth' });
      } else {
        win.scrollTo({ top: sectionScrollTop(top, api.inputs().offset, win.scrollY), behavior: 'smooth' });
      }
    };

    // Sections added, removed or renamed after the first render (a lazy page, a translation).
    const observer = new MutationObserver(scan);
    observer.observe(host, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: [SCROLLSPY_SECTION_ATTR] });

    host.addEventListener('click', onClick);
    doc.addEventListener('scroll', onScroll, { capture: true, passive: true });
    doc.addEventListener('transitionend', onSettle, settleOptions);
    doc.addEventListener('animationend', onSettle, settleOptions);
    scan();
    // Once more after the first layout: an overlay's container is scrollable by then.
    const frame = win.requestAnimationFrame(update);
    refreshers.set(host, update);
    return () => {
      win.cancelAnimationFrame(frame);
      refreshers.delete(host);
      observer.disconnect();
      host.removeEventListener('click', onClick);
      doc.removeEventListener('scroll', onScroll, { capture: true });
      doc.removeEventListener('transitionend', onSettle, settleOptions);
      doc.removeEventListener('animationend', onSettle, settleOptions);
    };
  },
  inputsChanged: (api, prev) => {
    const next = api.inputs();
    if (next.scrollContainer !== prev.scrollContainer || next.offset !== prev.offset) refreshers.get(api.host)?.();
  },
});
