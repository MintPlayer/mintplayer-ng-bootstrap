import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { paginationStyles } from '../styles';

export type PaginationSize = 'small' | 'medium' | 'large';

/** A rendered slot in the pagination list — either a page button or an ellipsis gap. */
export type PaginationItem =
  | { kind: 'page'; page: number; current: boolean }
  | { kind: 'gap' };

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

  /** Effective box budget (excludes arrows). */
  private effectiveBudget(): number {
    const fit = this.fittingBoxes();
    const arrowsCost = this._showArrows ? 2 : 0;
    const fitForPages = Math.max(1, fit - arrowsCost);
    if (this._numberOfBoxes <= 0) {
      return Math.min(fitForPages, this._pageNumbers.length);
    }
    const arrowsAccounted = this._showArrows ? Math.max(1, this._numberOfBoxes - arrowsCost) : this._numberOfBoxes;
    return Math.min(fitForPages, arrowsAccounted, this._pageNumbers.length);
  }

  /** Build the visible items (pages + gaps). Pure — no DOM access. */
  protected computeItems(): PaginationItem[] {
    return buildPaginationItems(this._pageNumbers, this._selectedPageNumber, this.effectiveBudget());
  }

  override render(): TemplateResult {
    const items = this.computeItems();
    const isFirst = this.isFirstPage();
    const isLast = this.isLastPage();
    return html`
      <nav aria-label=${this._ariaLabel}>
        <ul>
          ${this._showArrows
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
          ${items.map((item) =>
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
          ${this._showArrows
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
 * Pure helper: turn (pages, current, budget) into a visible-item list.
 *
 *   budget = max number of page slots (excluding arrows).
 *
 *   - budget <= 0 or budget >= pages.length → show every page
 *   - budget < 5                            → centered window, no anchors
 *   - budget >= 5                           → first + (gap?) + window + (gap?) + last
 *
 * A "1-away" edge gets the real page, not a gap (e.g. `1, 2, …` vs `1, … `).
 */
export function buildPaginationItems(
  pages: ReadonlyArray<number>,
  current: number,
  budget: number,
): PaginationItem[] {
  const n = pages.length;
  if (n === 0) return [];
  if (budget <= 0 || budget >= n) {
    return pages.map((p) => ({ kind: 'page', page: p, current: p === current }));
  }
  if (budget < 5) {
    return centeredWindow(pages, current, budget);
  }

  const idx = clampIndex(pages.indexOf(current), n);
  const lastIdx = n - 1;
  // Reserve 2 slots for the first + last anchors.
  // The inner window may use anywhere from `budget - 2` (gap on both sides)
  // up to `budget` (window touches both edges).
  // Strategy: iterate up to 4 times to let the window grow into the slots
  // freed by edges that don't actually need a gap.
  let leftCost = 2;
  let rightCost = 2;
  let lo = 0;
  let hi = 0;

  for (let pass = 0; pass < 4; pass++) {
    const innerBudget = Math.max(1, budget - leftCost - rightCost);
    [lo, hi] = windowAround(idx, innerBudget, 0, lastIdx);
    const newLeft = lo === 0 ? 0 : lo === 1 ? 1 : 2;
    const newRight = hi === lastIdx ? 0 : hi === lastIdx - 1 ? 1 : 2;
    if (newLeft === leftCost && newRight === rightCost) break;
    leftCost = newLeft;
    rightCost = newRight;
  }

  const toPage = (i: number): PaginationItem => ({
    kind: 'page',
    page: pages[i],
    current: pages[i] === current,
  });
  const leftPrefix: PaginationItem[] =
    lo >= 3 ? [toPage(0), { kind: 'gap' }] :
    lo === 2 ? [toPage(0), toPage(1)] :
    lo === 1 ? [toPage(0)] : [];
  const window: PaginationItem[] = Array.from({ length: hi - lo + 1 }, (_, k) => toPage(lo + k));
  const rightSuffix: PaginationItem[] =
    hi <= lastIdx - 3 ? [{ kind: 'gap' }, toPage(lastIdx)] :
    hi === lastIdx - 2 ? [toPage(lastIdx - 1), toPage(lastIdx)] :
    hi === lastIdx - 1 ? [toPage(lastIdx)] : [];
  return [...leftPrefix, ...window, ...rightSuffix];
}

function centeredWindow(
  pages: ReadonlyArray<number>,
  current: number,
  budget: number,
): PaginationItem[] {
  const idx = clampIndex(pages.indexOf(current), pages.length);
  const [lo, hi] = windowAround(idx, budget, 0, pages.length - 1);
  return Array.from({ length: hi - lo + 1 }, (_, i) => ({
    kind: 'page' as const,
    page: pages[lo + i],
    current: pages[lo + i] === current,
  }));
}

/** Window of `size` indices centered on `idx`, clamped to `[min, max]`. */
function windowAround(idx: number, size: number, min: number, max: number): [number, number] {
  const half = Math.floor((size - 1) / 2);
  let lo = idx - half;
  let hi = lo + size - 1;
  if (lo < min) {
    hi = Math.min(max, hi - lo + min);
    lo = min;
  }
  if (hi > max) {
    lo = Math.max(min, lo - (hi - max));
    hi = max;
  }
  return [lo, hi];
}

function clampIndex(idx: number, n: number): number {
  if (idx < 0) return 0;
  if (idx >= n) return n - 1;
  return idx;
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-pagination')) {
  customElements.define('mp-pagination', MpPagination);
}
