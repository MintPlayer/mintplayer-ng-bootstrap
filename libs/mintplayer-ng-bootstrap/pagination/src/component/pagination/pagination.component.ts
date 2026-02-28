import { ChangeDetectionStrategy, Component, computed, input, model } from '@angular/core';
import { Size } from '@mintplayer/ng-bootstrap';
import { PageWithSelection } from '../../interfaces/page-with-selection';

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

  /** Indicates whether there are too many numbers to the left-hand side of the current page. */
  isLeftOverflow = computed(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const visibleNumberOfNumberBoxes = this.visibleNumberOfNumberBoxes();
    const index = pageNumbers.indexOf(selectedPageNumber);
    const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
    return index > middle;
  });

  /** Indicates whether there are too many numbers to the right-hand side of the current page. */
  isRightOverflow = computed(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const visibleNumberOfNumberBoxes = this.visibleNumberOfNumberBoxes();
    const index = pageNumbers.indexOf(selectedPageNumber);
    const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
    return (pageNumbers.length - index) < middle;
  });

  /** Page numbers to be displayed to the user. */
  shownPageNumbers = computed<PageWithSelection[]>(() => {
    const pageNumbers = this.pageNumbers();
    const selectedPageNumber = this.selectedPageNumber();
    const visibleNumberOfNumberBoxes = this.visibleNumberOfNumberBoxes();

    let startIndex = 0;
    const half = Math.round((visibleNumberOfNumberBoxes - 1) / 2);
    if (pageNumbers.indexOf(selectedPageNumber) < half) {
      startIndex = 0;
    } else if (
      pageNumbers.indexOf(selectedPageNumber) >=
      pageNumbers.length - half
    ) {
      startIndex = pageNumbers.length - visibleNumberOfNumberBoxes;
    } else {
      startIndex = pageNumbers.indexOf(selectedPageNumber) - half;
    }

    return [...Array(visibleNumberOfNumberBoxes).keys()]
      .map((p) => p + startIndex)
      .map((p) => <PageWithSelection>{
        page: pageNumbers[p],
        selected: pageNumbers[p] === selectedPageNumber,
      });
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

  onSelectPage(event: MouseEvent, page: number) {
    this.selectedPageNumber.set(page);
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
