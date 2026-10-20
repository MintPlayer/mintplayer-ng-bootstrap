import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
} from '@angular/core';
import { Size } from '@mintplayer/ng-bootstrap';
import {
  connectPagination,
  isPlainClick,
  type PaginationLabels,
} from '@mintplayer/ui-core/pagination';
import { takeHostAria } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective } from '@mintplayer/ng-bootstrap/machine';

/**
 * Bootstrap's `.pagination` markup, rendered by this component's own
 * template (#437) from `@mintplayer/ui-core/pagination`. Pages are buttons;
 * with `hrefFor` they are real links, so SSR output navigates with
 * JavaScript off and a plain click selects in place. The consumer's
 * `aria-*` / `id` / `tabindex` on `<bs-pagination>` land on the `<nav>`.
 */
@Component({
  selector: 'bs-pagination',
  templateUrl: './pagination.component.html',
  imports: [MpPropsDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'class': 'd-block',
  },
})
export class BsPaginationComponent {
  private readonly host = inject(ElementRef).nativeElement as HTMLElement;
  private readonly hostAria = takeHostAria(this.host);

  /** All page numbers. */
  readonly pageNumbers = input<number[]>([]);
  /** Selected number. */
  readonly selectedPageNumber = model<number>(1);
  /** Cap on visible boxes, arrows included (0 = uncapped). */
  readonly numberOfBoxes = input<number>(0);
  /** Display previous/next arrows. */
  readonly showArrows = input<boolean>(true);
  /** Page number size. */
  readonly size = input<Size>('medium');
  /** Localized accessible names; missing keys fall back to English. */
  readonly labels = input<Partial<PaginationLabels> | null>(null);
  /** Renders every page as a link to this URL, so it works without JavaScript. */
  readonly hrefFor = input<((page: number) => string) | null>(null);

  readonly view = computed(() => connectPagination({
    pageNumbers: this.pageNumbers(),
    selectedPageNumber: this.selectedPageNumber(),
    numberOfBoxes: this.numberOfBoxes(),
    showArrows: this.showArrows(),
    size: this.size(),
    labels: this.labels(),
    hrefFor: this.hrefFor(),
  }));

  readonly navBag = computed(() => ({ ...this.view().nav, ...this.hostAria }));

  select(page: number | null): void {
    if (page !== null) this.selectedPageNumber.set(page);
  }

  onLinkClick(event: MouseEvent, page: number | null): void {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    this.select(page);
  }
}
