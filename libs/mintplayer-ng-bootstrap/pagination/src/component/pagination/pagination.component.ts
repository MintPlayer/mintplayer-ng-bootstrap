import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Size } from '@mintplayer/ng-bootstrap';
import { PageWithSelection } from '../../interfaces/page-with-selection';
import { PageNumberType } from '../../types/page-number.type';

@Component({
  selector: 'bs-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BsPaginationComponent {
  /** All page numbers. */
  pageNumbers = input<number[]>([]);
  /** Selected number. */
  selectedPageNumber = model<number>(1);
  /** Number of boxes. */
  numberOfBoxes = input<number>(0);
  /** Display previous/next arrows. */
  showArrows = input<boolean>(true);
  /** Page number size. */
  size = input<Size>('medium');

  /** The number of boxes (excluding arrows) that's being shown on the pagination component. */
  visibleNumberOfNumberBoxes = computed(() => {
    const numberOfBoxes = this.numberOfBoxes();
    const pageNumbers = this.pageNumbers();
    const showArrows = this.showArrows();
    if (numberOfBoxes <= 0) {
      return pageNumbers.length;
    } else if (!showArrows) {
      return Math.min(numberOfBoxes, pageNumbers.length);
    } else if (numberOfBoxes <= 2) {
      return Math.min(1, pageNumbers.length);
    } else {
      return Math.min(numberOfBoxes - 2, pageNumbers.length);
    }
  });

  /** Page numbers to be displayed to the user, with ellipsis entries where pages are omitted. */
  shownPageNumbers = computed<PageWithSelection[]>(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const budget = this.visibleNumberOfNumberBoxes();

    // No truncation needed
    if (budget <= 0 || budget >= pageNumbers.length) {
      return pageNumbers.map((p) => <PageWithSelection>{
        page: p,
        selected: p === selectedPageNumber,
      });
    }

    const selectedIndex = Math.max(0, Math.min(
      pageNumbers.indexOf(selectedPageNumber),
      pageNumbers.length - 1
    ));
    const lastIndex = pageNumbers.length - 1;

    // Centers a window of the given size on selectedIndex, clamped to valid range
    const calcWindow = (size: number): [number, number] => {
      const half = Math.floor((size - 1) / 2);
      let ws = selectedIndex - half;
      let we = ws + size - 1;
      if (ws < 0) { we = Math.min(lastIndex, we - ws); ws = 0; }
      if (we > lastIndex) { ws = Math.max(0, ws - (we - lastIndex)); we = lastIndex; }
      return [ws, we];
    };

    // For small budgets (< 5), just show a centered window — not enough room for anchors + ellipsis
    if (budget < 5) {
      const [ws, we] = calcWindow(budget);
      return Array.from({ length: we - ws + 1 }, (_, i) => <PageWithSelection>{
        page: pageNumbers[ws + i],
        selected: pageNumbers[ws + i] === selectedPageNumber,
      });
    }

    // For budget >= 5: reserve slots for first/last anchors and ellipsis, then fill the inner window.
    // Overhead per side: 0 (window reaches edge), 1 (window is 1 away from edge), or 2 (anchor + ellipsis/bridge).
    // Iterate until stable — converges in 2–4 iterations.
    let leftOverhead = 2;
    let rightOverhead = 2;
    let windowStart = 0;
    let windowEnd = 0;

    for (let iteration = 0; iteration < 4; iteration++) {
      const innerBudget = Math.max(1, budget - leftOverhead - rightOverhead);
      [windowStart, windowEnd] = calcWindow(innerBudget);

      const newLeftOverhead = windowStart === 0 ? 0 : windowStart === 1 ? 1 : 2;
      const newRightOverhead = windowEnd === lastIndex ? 0 : windowEnd === lastIndex - 1 ? 1 : 2;

      if (newLeftOverhead === leftOverhead && newRightOverhead === rightOverhead) break;
      leftOverhead = newLeftOverhead;
      rightOverhead = newRightOverhead;
    }

    // Build result
    const result: PageWithSelection[] = [];
    const pushPage = (index: number) => {
      result.push(<PageWithSelection>{
        page: pageNumbers[index],
        selected: pageNumbers[index] === selectedPageNumber,
      });
    };

    // Left anchor or bridge
    if (windowStart >= 3) {
      pushPage(0);
      result.push({ page: '...', selected: false });
    } else if (windowStart === 2) {
      pushPage(0);
      pushPage(1);
    } else if (windowStart === 1) {
      pushPage(0);
    }

    // Inner window
    for (let i = windowStart; i <= windowEnd; i++) {
      pushPage(i);
    }

    // Right bridge or anchor
    if (windowEnd <= lastIndex - 3) {
      result.push({ page: '...', selected: false });
      pushPage(lastIndex);
    } else if (windowEnd === lastIndex - 2) {
      pushPage(lastIndex - 1);
      pushPage(lastIndex);
    } else if (windowEnd === lastIndex - 1) {
      pushPage(lastIndex);
    }

    return result;
  });

  /** Indicates if first value is selected. */
  isFirstPage = computed(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    return pageNumbers.indexOf(selectedPageNumber) === 0;
  });

  /** Indicates if last value is selected. */
  isLastPage = computed(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    return pageNumbers.indexOf(selectedPageNumber) === pageNumbers.length - 1;
  });

  onSelectPage(event: MouseEvent, page: PageNumberType) {
    if (typeof page === 'number') {
      this.selectedPageNumber.set(page);
    }
    return false;
  }

  onPrevious() {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const index = pageNumbers.indexOf(selectedPageNumber);
    if (index > 0) {
      const newValue = pageNumbers[index - 1];
      this.selectedPageNumber.set(newValue);
    } else {
      this.selectedPageNumber.set(pageNumbers[0]);
    }
    return false;
  }

  onNext() {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const index = pageNumbers.indexOf(selectedPageNumber);
    if (index < 0) {
      this.selectedPageNumber.set(pageNumbers[pageNumbers.length - 1]);
    } else if (index < pageNumbers.length - 1) {
      this.selectedPageNumber.set(pageNumbers[index + 1]);
    } else {
      this.selectedPageNumber.set(pageNumbers[pageNumbers.length - 1]);
    }
    return false;
  }
}
