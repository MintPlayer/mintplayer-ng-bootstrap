import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { paginationStyles } from '../styles';

export type PaginationSize = 'small' | 'medium' | 'large';

/** A rendered slot in the pagination list — either a page button or an ellipsis gap. */
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

export interface PageChangeEventDetail {
  page: number;
}

const APPROX_BOX_WIDTH_PX: Record<PaginationSize, number> = {
  small: 36,
  medium: 44,
  large: 56,
};

/**
 * `<mp-pagination>` — page selector with first/last anchors, ellipsis gaps,
 * and previous/next arrows. Responsive: when `number-of-boxes` would exceed
 * the available width (e.g. on mobile), the WC clamps the visible budget to
 * what fits, never overflowing.
 */
export class MpPagination extends LitElement {
  static override styles = [paginationStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'page-numbers',
      'selected-page-number',
      'number-of-boxes',
      'show-arrows',
      'size',
      'aria-label',
    ];
  }

  private _pageNumbers: number[] = [];
  private _selectedPageNumber = 1;
  private _numberOfBoxes = 0;
  private _showArrows = true;
  private _size: PaginationSize = 'medium';
  private _ariaLabel = 'Pagination';
  private _hostWidth = 0;
  private _resizeObserver: ResizeObserver | null = null;

  get pageNumbers(): number[] {
    return [...this._pageNumbers];
  }
  set pageNumbers(value: number[] | ReadonlyArray<number>) {
    this._pageNumbers = Array.isArray(value) ? [...value] : [];
    this.requestUpdate();
  }

  get selectedPageNumber(): number {
    return this._selectedPageNumber;
  }
  set selectedPageNumber(value: number) {
    const next = Number(value);
    if (Number.isFinite(next) && next !== this._selectedPageNumber) {
      this._selectedPageNumber = next;
      this.requestUpdate();
    }
  }

  get numberOfBoxes(): number {
    return this._numberOfBoxes;
  }
  set numberOfBoxes(value: number) {
    const next = Math.max(0, Math.floor(value || 0));
    if (this._numberOfBoxes !== next) {
      this._numberOfBoxes = next;
      this.requestUpdate();
    }
  }

  get showArrows(): boolean {
    return this._showArrows;
  }
  set showArrows(value: boolean) {
    const next = !!value;
    if (this._showArrows !== next) {
      this._showArrows = next;
      this.requestUpdate();
    }
  }

  get size(): PaginationSize {
    return this._size;
  }
  set size(value: PaginationSize) {
    if (value === 'small' || value === 'medium' || value === 'large') {
      if (this._size !== value) {
        this._size = value;
        this.setAttribute('size', value);
        this.requestUpdate();
      }
    }
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'page-numbers' && newValue) {
      const parsed = newValue
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      this.pageNumbers = parsed;
    } else if (name === 'selected-page-number') {
      const n = Number(newValue);
      if (Number.isFinite(n)) this.selectedPageNumber = n;
    } else if (name === 'number-of-boxes') {
      const n = Number(newValue);
      if (Number.isFinite(n)) this.numberOfBoxes = n;
    } else if (name === 'show-arrows') {
      this.showArrows = newValue !== 'false' && newValue !== null;
    } else if (name === 'size') {
      if (newValue === 'small' || newValue === 'medium' || newValue === 'large') {
        this.size = newValue;
      }
    } else if (name === 'aria-label') {
      this._ariaLabel = newValue ?? 'Pagination';
      this.requestUpdate();
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver((entries) => {
        const w = Math.floor(entries[0]?.contentRect.width ?? 0);
        if (Math.abs(w - this._hostWidth) >= 4) {
          this._hostWidth = w;
          this.requestUpdate();
        }
      });
      this._resizeObserver.observe(this);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._resizeObserver?.disconnect();
    this._resizeObserver = null;
  }

  /**
   * Maximum visible boxes that fit in the host, given the current size.
   * Consumers cap with `numberOfBoxes`; the WC further clamps to what fits.
   */
  private fittingBoxes(): number {
    const w = this._hostWidth || this.clientWidth || 0;
    if (w <= 0) return Number.POSITIVE_INFINITY;
    return Math.max(1, Math.floor(w / APPROX_BOX_WIDTH_PX[this._size]));
  }

  /** Effective TOTAL budget (boxes including arrows). */
  private effectiveBudget(): number {
    const fit = this.fittingBoxes();
    if (this._numberOfBoxes <= 0) {
      return Math.min(fit, this._pageNumbers.length + (this._showArrows ? 2 : 0));
    }
    return Math.min(fit, this._numberOfBoxes);
  }

  /** Build the full layout — arrows + page items. Pure — no DOM access. */
  protected computeLayout(): PaginationLayout {
    return buildPaginationLayout(
      this._pageNumbers,
      this._selectedPageNumber,
      this.effectiveBudget(),
      this._showArrows,
    );
  }

  override render(): TemplateResult {
    const layout = this.computeLayout();
    const isFirst = this.isFirstPage();
    const isLast = this.isLastPage();
    return html`
      <nav aria-label=${this._ariaLabel}>
        <ul>
          ${layout.showPrev
            ? html`<li>
                <button
                  type="button"
                  class="page-link"
                  aria-label="Previous"
                  ?disabled=${isFirst}
                  @click=${() => this.onPrevious()}
                >
                  <span aria-hidden="true">&laquo;</span>
                  <span class="visually-hidden">Previous</span>
                </button>
              </li>`
            : nothing}
          ${layout.items.map((item) =>
            item.kind === 'gap'
              ? html`<li>
                  <span class="ellipsis" aria-hidden="true">&hellip;</span>
                </li>`
              : html`<li>
                  <button
                    type="button"
                    class="page-link"
                    aria-current=${item.current ? 'page' : nothing}
                    aria-label=${`Page ${item.page}`}
                    @click=${() => this.selectPage(item.page)}
                  >
                    ${item.page}
                  </button>
                </li>`,
          )}
          ${layout.showNext
            ? html`<li>
                <button
                  type="button"
                  class="page-link"
                  aria-label="Next"
                  ?disabled=${isLast}
                  @click=${() => this.onNext()}
                >
                  <span aria-hidden="true">&raquo;</span>
                  <span class="visually-hidden">Next</span>
                </button>
              </li>`
            : nothing}
        </ul>
      </nav>
    `;
  }

  private isFirstPage(): boolean {
    return this._pageNumbers.indexOf(this._selectedPageNumber) === 0;
  }

  private isLastPage(): boolean {
    return this._pageNumbers.indexOf(this._selectedPageNumber) === this._pageNumbers.length - 1;
  }

  private selectPage(page: number): void {
    if (page === this._selectedPageNumber) return;
    if (!this._pageNumbers.includes(page)) return;
    this._selectedPageNumber = page;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<PageChangeEventDetail>('mp-pagination-page-change', {
        detail: { page },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private onPrevious(): void {
    const idx = this._pageNumbers.indexOf(this._selectedPageNumber);
    const target = idx > 0 ? this._pageNumbers[idx - 1] : this._pageNumbers[0];
    if (target != null) this.selectPage(target);
  }

  private onNext(): void {
    const idx = this._pageNumbers.indexOf(this._selectedPageNumber);
    const last = this._pageNumbers.length - 1;
    const target = idx < 0 ? this._pageNumbers[last] : idx < last ? this._pageNumbers[idx + 1] : this._pageNumbers[last];
    if (target != null) this.selectPage(target);
  }
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

  const items: PaginationItem[] = [
    ...startPages,
    ...leftGap,
    ...beforePages,
    toPage(currentIdx),
    ...afterPages,
    ...rightGap,
    ...endPages,
  ];

  return { showPrev, showNext, items };
}

function clampIndex(idx: number, n: number): number {
  if (idx < 0) return 0;
  if (idx >= n) return n - 1;
  return idx;
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-pagination')) {
  customElements.define('mp-pagination', MpPagination);
}
