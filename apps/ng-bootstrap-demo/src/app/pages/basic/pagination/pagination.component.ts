import { ChangeDetectionStrategy, Component, model, signal } from '@angular/core';
import { BsGridComponent, BsGridRowDirective, BsGridColumnDirective } from '@mintplayer/ng-bootstrap/grid';
import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
import { BsCodeSnippetComponent } from '@mintplayer/ng-bootstrap/code-snippet';
import { dedent } from 'ts-dedent';
@Component({
  selector: 'demo-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [
    BsCodeSnippetComponent,
    BsPaginationComponent,
    BsGridComponent,
    BsGridRowDirective,
    BsGridColumnDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaginationComponent {

  protected readonly snippetBasicHtml = dedent`
    <bs-pagination
      [pageNumbers]="pages()"
      [(selectedPageNumber)]="selectedPage">
    </bs-pagination>
  `;

  protected readonly snippetBasicTs = dedent`
    import { Component, model, signal } from '@angular/core';
    import { BsPaginationComponent } from '@mintplayer/ng-bootstrap/pagination';
    @Component({
      selector: 'my-pagination-demo',
      templateUrl: './my-pagination-demo.component.html',
      imports: [BsPaginationComponent],
    })
    export class MyPaginationDemoComponent {
      protected readonly pages = signal<number[]>(
        [...Array(20).keys()].map((p) => p + 1),
      );
      protected readonly selectedPage = model(1);
    }
  `;

  protected readonly snippetCappedHtml = dedent`
    <!-- Cap the visible box budget; the component slides the window as the
         selection moves and shows … on the gapped side(s). -->
    <bs-pagination
      [pageNumbers]="pages()"
      [(selectedPageNumber)]="selectedPage"
      [numberOfBoxes]="9">
    </bs-pagination>
  `;

  protected readonly snippetSelectorHtml = dedent`
    <!-- Non-contiguous values + arrows hidden — "rows per page" selector. -->
    <bs-pagination
      [pageNumbers]="[10, 20, 50, 100, 200]"
      [(selectedPageNumber)]="rowsPerPage"
      [showArrows]="false">
    </bs-pagination>
  `;

  protected readonly snippetSizesHtml = dedent`
    <bs-pagination [pageNumbers]="pages()" [(selectedPageNumber)]="selectedPage" [size]="'small'"  [numberOfBoxes]="9"></bs-pagination>
    <bs-pagination [pageNumbers]="pages()" [(selectedPageNumber)]="selectedPage" [size]="'medium'" [numberOfBoxes]="9"></bs-pagination>
    <bs-pagination [pageNumbers]="pages()" [(selectedPageNumber)]="selectedPage" [size]="'large'"  [numberOfBoxes]="9"></bs-pagination>
  `;


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

  /** Small enough set that omitting `numberOfBoxes` is fine — every page renders. */
  responsivePages = signal<number[]>([...Array(12).keys()].map((p) => p + 1));
  responsiveSelected = model(7);

  /** Selector-style paginator (e.g. "rows per page"): non-contiguous values, arrows hidden. */
  selectorPages = signal<number[]>([10, 20, 50, 100, 200]);
  selectorSelected = model(20);

  /** Demonstrates the `size` variants; the responsive auto-fit accounts for box width. */
  sizesPages = signal<number[]>([...Array(20).keys()].map((p) => p + 1));
  sizesSelected = model(8);
}
