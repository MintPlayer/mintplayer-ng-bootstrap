import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import {
  buildPaginationLayout,
  type PaginationLayout,
  type PaginationSize,
} from '@mintplayer/ui-core/pagination';
import { paginationStyles } from '../styles';

// The layout lives in the headless core (#437); re-exported for existing importers.
export { buildPaginationLayout };
export type { PaginationItem, PaginationLayout, PaginationSize } from '@mintplayer/ui-core/pagination';

export interface PageChangeEventDetail {
  page: number;
}

/**
 * `<mp-pagination>` — page selector with first/last anchors, ellipsis gaps,
 * and previous/next arrows. The visible budget is fully driven by the
 * `numberOfBoxes` input (0 = uncapped). Layout-time auto-fit was tried
 * earlier but produced a feedback loop with flex parents whose item width
 * resolves from their content's `max-content` — the consumer is responsible
 * for picking a cap that fits the host on their target viewports.
 *
 * The framework fronts, and the datatable's own pager (#437 M5), render
 * Bootstrap's `.pagination` markup from `connectPagination`; this element is
 * the plain web-components consumer's.
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
    if (name === 'page-numbers') {
      // A removed attribute clears the list; it used to be ignored, leaving the
      // last pages rendered after a framework binding cleared it.
      const parsed = (newValue ?? '')
        .split(',')
        .filter((s) => s.trim() !== '')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n));
      this.pageNumbers = parsed;
    } else if (name === 'selected-page-number') {
      // Removing an attribute restores its default: Number(null) is 0, which
      // used to select a page 0 that no paginator has.
      const n = newValue === null ? 1 : Number(newValue);
      if (Number.isFinite(n)) this.selectedPageNumber = n;
    } else if (name === 'number-of-boxes') {
      const n = Number(newValue);
      if (Number.isFinite(n)) this.numberOfBoxes = n;
    } else if (name === 'show-arrows') {
      // Default-on: only "false" switches it off, and removal restores it.
      this.showArrows = newValue !== 'false';
    } else if (name === 'size') {
      const size = newValue ?? 'medium';
      if (size === 'small' || size === 'medium' || size === 'large') {
        this.size = size;
      }
    } else if (name === 'aria-label') {
      this._ariaLabel = newValue ?? 'Pagination';
      this.requestUpdate();
    }
  }

  /**
   * Effective TOTAL budget (boxes including arrows). When `numberOfBoxes`
   * is `0` the budget is uncapped and all pages render; otherwise the cap
   * is honoured verbatim. (An earlier ResizeObserver-driven "auto-fit"
   * was removed — its measurement of self-width fed back into the rendered
   * content and the WC + flex parent could oscillate or lock the budget
   * to a single button.)
   */
  private effectiveBudget(): number {
    const total = this._pageNumbers.length + (this._showArrows ? 2 : 0);
    if (this._numberOfBoxes <= 0) return total;
    return Math.min(total, this._numberOfBoxes);
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
          ${repeat(layout.items, (item, index) => (item.kind === 'gap' ? `gap-${index}` : `page-${item.page}`), (item) =>
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

if (typeof customElements !== 'undefined' && !customElements.get('mp-pagination')) {
  customElements.define('mp-pagination', MpPagination);
}
