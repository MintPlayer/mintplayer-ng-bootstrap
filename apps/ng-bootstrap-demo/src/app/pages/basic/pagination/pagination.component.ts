import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';

@Component({
  selector: 'demo-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [
    BsPaginationComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {

  /** Just 5 pages — everything fits, no ellipsis ever appears. */
  smallPages = signal<number[]>([...Array(5).keys()].map((p) => p + 1));
  smallSelected = model(3);

  /** The 1-page-gap collapse case from the PRD: page 6 is shown directly. */
  collapsePages = signal<number[]>([...Array(7).keys()].map((p) => p + 1));
  collapseSelected = model(5);

  /** Many pages, mid-selection — shows symmetric ellipses on both sides. */
  cappedPages = signal<number[]>([...Array(30).keys()].map((p) => p + 1));
  cappedSelected = model(15);

  /** Same dataset but selection sits near the start — only the right ellipsis renders. */
  nearStartPages = signal<number[]>([...Array(30).keys()].map((p) => p + 1));
  nearStartSelected = model(2);

  /** Same dataset, selection near the end — only the left ellipsis renders. */
  nearEndPages = signal<number[]>([...Array(30).keys()].map((p) => p + 1));
  nearEndSelected = model(29);

  /** No `numberOfBoxes` cap — the ResizeObserver shrinks / grows the visible budget with the host width. */
  responsivePages = signal<number[]>([...Array(100).keys()].map((p) => p + 1));
  responsiveSelected = model(42);

  /** Selector-style paginator (e.g. "rows per page"): non-contiguous values, arrows hidden. */
  selectorPages = signal<number[]>([10, 20, 50, 100, 200]);
  selectorSelected = model(20);

  /** Demonstrates the `size` variants; the responsive auto-fit accounts for box width. */
  sizesPages = signal<number[]>([...Array(20).keys()].map((p) => p + 1));
  sizesSelected = model(8);
}
