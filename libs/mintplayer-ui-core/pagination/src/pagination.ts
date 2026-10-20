/**
 * The pagination has no machine (PRD #437 §8, wave A): the selected page is
 * the front's own model, and everything else is a pure function of it. What
 * the fronts share is the layout (which pages, gaps and arrows fit the box
 * budget), the Bootstrap classes and the attribute bag per link, so the ARIA
 * contract is written in one place.
 *
 * Markup (every front renders the same):
 *
 *   <nav aria-label><ul class="pagination[ pagination-sm|-lg]">
 *     <li class="page-item[ active| disabled]"><button|a class="page-link"></li>
 *   </ul></nav>
 *
 * Links are `<button>`s by default. With `hrefFor` they are `<a href>`s, so a
 * page renders and navigates with JavaScript off (and in Angular SSR); a
 * front then intercepts a plain click (`isPlainClick`) to select the page in
 * place, and leaves a modified click (new tab, new window) to the browser. A
 * disabled arrow keeps no `href`, which makes it a placeholder rather than a
 * link, and carries `aria-disabled`.
 */

export type PaginationSize = 'small' | 'medium' | 'large';

/** A rendered slot in the pagination list: a page or an ellipsis gap. */
export type PaginationItem =
  | { kind: 'page'; page: number; current: boolean }
  | { kind: 'gap' };

/**
 * Full layout produced by `buildPaginationLayout`: which arrow buttons fit
 * the budget, plus the ordered page / gap items between them.
 */
export interface PaginationLayout {
  showPrev: boolean;
  showNext: boolean;
  items: PaginationItem[];
}

/** The accessible names. Localize them; the defaults are English. */
export interface PaginationLabels {
  readonly navigation: string;
  readonly previous: string;
  readonly next: string;
  readonly page: (page: number) => string;
}

export const DEFAULT_PAGINATION_LABELS: PaginationLabels = {
  navigation: 'Pagination',
  previous: 'Previous',
  next: 'Next',
  page: (page) => `Page ${page}`,
};

export interface PaginationState {
  readonly pageNumbers: readonly number[];
  readonly selectedPageNumber: number;
  /** Cap on visible boxes, arrows included; `0` is uncapped. */
  readonly numberOfBoxes: number;
  readonly showArrows: boolean;
  readonly size: PaginationSize;
  readonly labels?: Partial<PaginationLabels> | null;
  /** Renders links instead of buttons. */
  readonly hrefFor?: ((page: number) => string) | null;
}

export type PaginationLinkBag = Record<string, string | number | boolean | null>;

export type PaginationEntry =
  | {
      readonly kind: 'link';
      /** Stable key for keyed rendering. */
      readonly key: string;
      readonly itemClass: string;
      readonly attrs: PaginationLinkBag;
      readonly text: string;
      /** The page this link selects; `null` when it is disabled. */
      readonly target: number | null;
      /**
       * The link's URL with `hrefFor`, else `null`. Kept out of `attrs` because the
       * bridges refuse URL-bearing names: each front binds it explicitly.
       */
      readonly href: string | null;
    }
  | {
      readonly kind: 'gap';
      readonly key: string;
      readonly itemClass: string;
      readonly attrs: PaginationLinkBag;
      readonly text: string;
    };

export interface PaginationView {
  readonly nav: PaginationLinkBag;
  readonly listClass: string;
  /** `a` with `hrefFor`, otherwise `button`. */
  readonly tag: 'a' | 'button';
  readonly entries: readonly PaginationEntry[];
}

const SIZE_CLASS: Record<PaginationSize, string> = {
  small: 'pagination pagination-sm',
  medium: 'pagination',
  large: 'pagination pagination-lg',
};

export function isPaginationSize(value: unknown): value is PaginationSize {
  return value === 'small' || value === 'medium' || value === 'large';
}

/** The page "previous" selects, or `null` on the first page. */
export function previousPage(pages: readonly number[], current: number): number | null {
  const idx = pages.indexOf(current);
  if (idx < 0) return pages[0] ?? null;
  return idx > 0 ? pages[idx - 1] : null;
}

/** The page "next" selects, or `null` on the last page. */
export function nextPage(pages: readonly number[], current: number): number | null {
  const idx = pages.indexOf(current);
  if (pages.length === 0 || idx === pages.length - 1) return null;
  return idx < 0 ? pages[pages.length - 1] : pages[idx + 1];
}

/**
 * True for a primary-button click with no modifier key: the one a front
 * handles in place. Anything else on an `hrefFor` link is the browser's.
 */
export function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey;
}

/** The view every front renders: nav bag, list class, link tag and entries. */
export function connectPagination(state: PaginationState): PaginationView {
  const labels = { ...DEFAULT_PAGINATION_LABELS, ...(state.labels ?? {}) };
  const hrefFor = state.hrefFor ?? null;
  const pages = state.pageNumbers;
  const total = pages.length + (state.showArrows ? 2 : 0);
  const budget = state.numberOfBoxes <= 0 ? total : Math.min(total, state.numberOfBoxes);
  const layout = buildPaginationLayout(pages, state.selectedPageNumber, budget, state.showArrows);

  const link = (key: string, text: string, label: string, target: number | null, current: boolean): PaginationEntry => {
    const disabled = target === null;
    const attrs: PaginationLinkBag = hrefFor
      ? {
          class: 'page-link',
          'aria-label': label,
          'aria-current': current ? 'page' : null,
          'aria-disabled': disabled ? 'true' : null,
        }
      : {
          type: 'button',
          class: 'page-link',
          'aria-label': label,
          'aria-current': current ? 'page' : null,
          disabled: disabled ? true : null,
        };
    const itemClass = current ? 'page-item active' : disabled ? 'page-item disabled' : 'page-item';
    const href = hrefFor && !disabled ? hrefFor(target) : null;
    return { kind: 'link', key, itemClass, attrs, text, target, href };
  };

  const prev = layout.showPrev
    ? [link('prev', '«', labels.previous, previousPage(pages, state.selectedPageNumber), false)]
    : [];
  const next = layout.showNext
    ? [link('next', '»', labels.next, nextPage(pages, state.selectedPageNumber), false)]
    : [];
  const items = layout.items.map((item, index): PaginationEntry =>
    item.kind === 'gap'
      ? { kind: 'gap', key: `gap-${index}`, itemClass: 'page-item disabled', attrs: { class: 'page-link', 'aria-hidden': 'true' }, text: '…' }
      // The current page stays a live link (a no-op select) so it keeps its place in the tab order.
      : link(`page-${item.page}`, String(item.page), labels.page(item.page), item.page, item.current),
  );

  return {
    nav: { 'aria-label': labels.navigation },
    listClass: SIZE_CLASS[state.size] ?? SIZE_CLASS.medium,
    tag: hrefFor ? 'a' : 'button',
    entries: [...prev, ...items, ...next],
  };
}

/**
 * Pure helper: deterministic layout for `(pages, current, totalBudget, showArrows)`.
 *
 * `totalBudget` is the maximum visible boxes — pages AND arrows count toward it.
 * The current page is always slot #1; subsequent slots are allocated by
 * stepping through a fixed priority sequence:
 *
 *   1. Arrows (next, then prev) when `showArrows`.
 *   2. **Phase 1** — round-robin `[start, end, before, after]`:
 *      - start: page #1
 *      - end: last page
 *      - before: left ellipsis
 *      - after: right ellipsis
 *   3. **Phase 2+** — round-robin `[before, after, start, end]`, repeated
 *      until budget runs out. Each pass adds one page in that direction:
 *      - before extends C-1, C-2, …
 *      - after extends C+1, C+2, …
 *      - start extends 2, 3, …
 *      - end extends last-1, last-2, …
 *
 * When a direction has no more pages to add (overlap with another direction,
 * or current at an extreme), that step is skipped and the cycle continues
 * with the next action.
 *
 * See `docs/issue_329_PRD.md` § "Growth algorithm".
 */
export function buildPaginationLayout(
  pages: ReadonlyArray<number>,
  current: number,
  totalBudget: number,
  showArrows: boolean,
): PaginationLayout {
  const n = pages.length;
  if (n === 0) return { showPrev: false, showNext: false, items: [] };

  const currentIdx = clampIndex(pages.indexOf(current), n);
  const budget = Math.max(1, Math.floor(totalBudget));

  // Counters that drive the layout. Each represents how far that direction
  // has extended outward from its anchor.
  // - startCount: number of pages shown from the start (page indices [0, startCount-1])
  // - endCount: number of pages shown from the end (page indices [n-endCount, n-1])
  // - beforeCount: 0 = nothing, 1 = ellipsis only, k>=2 = ellipsis + (k-1) pages (C-1, ..., C-(k-1))
  // - afterCount: same shape on the right
  let showPrev = false;
  let showNext = false;
  let startCount = 0;
  let endCount = 0;
  let beforeCount = 0;
  let afterCount = 0;
  let remaining = budget - 1; // current always shown

  // Arrows first (priority 1).
  if (showArrows && remaining > 0) { showNext = true; remaining--; }
  if (showArrows && remaining > 0) { showPrev = true; remaining--; }

  const canStart = (): boolean => {
    if (startCount >= currentIdx) return false;
    if (startCount >= n - endCount) return false;
    if (beforeCount >= 2 && startCount >= currentIdx - (beforeCount - 1)) return false;
    return true;
  };
  const canEnd = (): boolean => {
    if (n - 1 - endCount <= currentIdx) return false;
    if (n - 1 - endCount < startCount) return false;
    if (afterCount >= 2 && n - 1 - endCount <= currentIdx + (afterCount - 1)) return false;
    return true;
  };
  const canBefore = (): boolean => {
    if (currentIdx === 0) return false;
    // First call introduces the ellipsis — only meaningful when there are
    // at least 2 hidden pages between the start range and current. With a
    // 1-page gap the start/before extension fills it cleanly without "...".
    if (beforeCount === 0) return startCount + 1 < currentIdx;
    return currentIdx - beforeCount >= startCount;
  };
  const canAfter = (): boolean => {
    if (currentIdx === n - 1) return false;
    if (afterCount === 0) return currentIdx + 1 < n - 1 - endCount;
    return currentIdx + afterCount <= n - 1 - endCount;
  };
  // Hidden-page counts (used by the "ellipsis-or-edge" fall-back below and
  // by the render step's 1-page-gap collapse).
  const hiddenLeft = (): number =>
    currentIdx - startCount - Math.max(0, beforeCount - 1);
  const hiddenRight = (): number =>
    n - 1 - currentIdx - endCount - Math.max(0, afterCount - 1);

  // Phase 1: introduce edges + ellipses in fixed order.
  if (remaining > 0 && canStart()) { startCount++; remaining--; }
  if (remaining > 0 && canEnd()) { endCount++; remaining--; }
  // "before-or-fill": prefer the left ellipsis when there are 2+ hidden
  // pages; for a 1-page gap, extend the start range instead so the lone
  // hidden page becomes visible (matches user spec: don't render an
  // ellipsis that represents a single page).
  if (remaining > 0) {
    if (canBefore()) { beforeCount++; remaining--; }
    else if (hiddenLeft() > 0 && canStart()) { startCount++; remaining--; }
  }
  if (remaining > 0) {
    if (canAfter()) { afterCount++; remaining--; }
    else if (hiddenRight() > 0 && canEnd()) { endCount++; remaining--; }
  }

  // Phase 2+: round-robin [before, after, start, end]. Skip exhausted
  // directions. Loop exits when budget is gone or all four directions are
  // exhausted in a single pass.
  while (remaining > 0) {
    const before = remaining;
    if (canBefore()) { beforeCount++; remaining--; }
    if (remaining === 0) break;
    if (canAfter()) { afterCount++; remaining--; }
    if (remaining === 0) break;
    if (canStart()) { startCount++; remaining--; }
    if (remaining === 0) break;
    if (canEnd()) { endCount++; remaining--; }
    if (before === remaining) break; // no progress → all directions exhausted
  }

  const toPage = (i: number): PaginationItem => ({
    kind: 'page',
    page: pages[i],
    current: pages[i] === current,
  });

  const startPages: PaginationItem[] = Array.from({ length: startCount }, (_, i) => toPage(i));
  const beforePages: PaginationItem[] = beforeCount >= 2
    ? Array.from({ length: beforeCount - 1 }, (_, i) => toPage(currentIdx - (beforeCount - 1) + i))
    : [];
  const afterPages: PaginationItem[] = afterCount >= 2
    ? Array.from({ length: afterCount - 1 }, (_, i) => toPage(currentIdx + 1 + i))
    : [];
  const endPages: PaginationItem[] = Array.from({ length: endCount }, (_, i) => toPage(n - endCount + i));

  // Ellipses are rendered only when 2+ unrendered pages remain. With exactly
  // 1 hidden page the slot reserved for the ellipsis is repurposed to show
  // that page directly (an ellipsis representing a single page is just less
  // informative than the page itself).
  const lastStartIdx = startCount - 1;
  const firstBeforeIdx = beforeCount >= 2 ? currentIdx - (beforeCount - 1) : currentIdx;
  const leftHidden = hiddenLeft();
  const leftGap: PaginationItem[] =
    beforeCount >= 1 && lastStartIdx + 1 < firstBeforeIdx
      ? leftHidden === 1
        ? [toPage(lastStartIdx + 1)]
        : [{ kind: 'gap' }]
      : [];

  const lastAfterIdx = afterCount >= 2 ? currentIdx + (afterCount - 1) : currentIdx;
  const firstEndIdx = n - endCount;
  const rightHidden = hiddenRight();
  const rightGap: PaginationItem[] =
    afterCount >= 1 && lastAfterIdx + 1 < firstEndIdx
      ? rightHidden === 1
        ? [toPage(lastAfterIdx + 1)]
        : [{ kind: 'gap' }]
      : [];

  return {
    showPrev,
    showNext,
    items: [
      ...startPages,
      ...leftGap,
      ...beforePages,
      toPage(currentIdx),
      ...afterPages,
      ...rightGap,
      ...endPages,
    ],
  };
}

function clampIndex(idx: number, n: number): number {
  if (idx < 0) return 0;
  if (idx >= n) return n - 1;
  return idx;
}
