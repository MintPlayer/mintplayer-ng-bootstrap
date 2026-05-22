import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  ElementRef,
  input,
  model,
  viewChild,
} from '@angular/core';
import { Size } from '@mintplayer/ng-bootstrap';
import { type MpPagination, type PageChangeEventDetail, type PaginationSize } from '@mintplayer/web-components/pagination';
// Side-effect import: registers <mp-pagination>.
import '@mintplayer/web-components/pagination';

const SIZE_MAP: Record<Size, PaginationSize> = {
  small: 'small',
  medium: 'medium',
  large: 'large',
};

@Component({
  selector: 'bs-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsPaginationComponent {
  /** All page numbers. */
  readonly pageNumbers = input<number[]>([]);
  /** Selected number. */
  readonly selectedPageNumber = model<number>(1);
  /** Number of boxes (cap on visible items; the WC clamps to whatever fits the host). */
  readonly numberOfBoxes = input<number>(0);
  /** Display previous/next arrows. */
  readonly showArrows = input<boolean>(true);
  /** Page number size. */
  readonly size = input<Size>('medium');
  /** Accessible name on the surrounding `<nav>` landmark. */
  readonly ariaLabel = input<string>('Pagination');

  protected readonly paginationRef = viewChild<ElementRef<MpPagination>>('pagination');

  constructor() {
    effect(() => {
      const el = this.paginationRef()?.nativeElement;
      if (!el) return;
      el.pageNumbers = this.pageNumbers();
      el.selectedPageNumber = this.selectedPageNumber();
      el.numberOfBoxes = this.numberOfBoxes();
      el.showArrows = this.showArrows();
      el.size = SIZE_MAP[this.size()] ?? 'medium';
      el.setAttribute('aria-label', this.ariaLabel());
    });
  }

  onPageChange(event: Event): void {
    const detail = (event as CustomEvent<PageChangeEventDetail>).detail;
    this.selectedPageNumber.set(detail.page);
  }
}
