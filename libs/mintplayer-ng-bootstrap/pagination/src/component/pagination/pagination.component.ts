import { Component, EventEmitter, Input, Output, signal, computed, effect } from '@angular/core';
import { Size } from '@mintplayer/ng-bootstrap';
import { PageWithSelection } from '../../interfaces/page-with-selection';

@Component({
  selector: 'bs-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [],
})
export class BsPaginationComponent {
  constructor() {
    this.visibleNumberOfNumberBoxes = computed(() => {
      const numberOfBoxes = this.numberOfBoxesSignal();
      const pageNumbers = this.pageNumbersSignal();
      const showArrows = this.showArrowsSignal();
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

    this.isLeftOverflow = computed(() => {
      const pageNumbers = this.pageNumbersSignal();
      const selectedPageNumber = this.selectedPageNumberSignal();
      const visibleNumberOfNumberBoxes = this.visibleNumberOfNumberBoxes();
      const index = pageNumbers.indexOf(selectedPageNumber);
      const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
      return index > middle;
    });

    this.isRightOverflow = computed(() => {
      const pageNumbers = this.pageNumbersSignal();
      const selectedPageNumber = this.selectedPageNumberSignal();
      const visibleNumberOfNumberBoxes = this.visibleNumberOfNumberBoxes();
      const index = pageNumbers.indexOf(selectedPageNumber);
      const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
      return (pageNumbers.length - index) < middle;
    });

    this.shownPageNumbers = computed(() => {
      const pageNumbers = this.pageNumbersSignal();
      const selectedPageNumber = this.selectedPageNumberSignal();
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

    this.isFirstPage = computed(() => {
      const pageNumbers = this.pageNumbersSignal();
      const selectedPageNumber = this.selectedPageNumberSignal();
      return pageNumbers.indexOf(selectedPageNumber) === 0;
    });

    this.isLastPage = computed(() => {
      const pageNumbers = this.pageNumbersSignal();
      const selectedPageNumber = this.selectedPageNumberSignal();
      return pageNumbers.indexOf(selectedPageNumber) === pageNumbers.length - 1;
    });

    effect(() => {
      this.selectedPageNumberChange.emit(this.selectedPageNumberSignal());
    });
  }

  /** All page numbers. */
  pageNumbersSignal = signal<number[]>([]);
  @Input() set pageNumbers(val: number[]) {
    this.pageNumbersSignal.set(val);
  }
  /** Page numbers to be displayed to the user. */
  shownPageNumbers;
  /** Selected number. */
  selectedPageNumberSignal = signal<number>(1);
  @Input() set selectedPageNumber(val: number) {
    this.selectedPageNumberSignal.set(val);
  }
  /** Number of boxes. */
  numberOfBoxesSignal = signal<number>(0);
  @Input() set numberOfBoxes(val: number) {
    this.numberOfBoxesSignal.set(val);
  }
  /** Display previous/next arrows. */
  showArrowsSignal = signal<boolean>(true);
  @Input() set showArrows(val: boolean) {
    this.showArrowsSignal.set(val);
  }
  /** Page number size. */
  sizeSignal = signal<Size>('medium');
  @Input() set size(val: Size) {
    this.sizeSignal.set(val);
  }

  /** Indicates if first value is selected. */
  isFirstPage;
  /** Indicates if last value is selected. */
  isLastPage;
  /** The number of boxes (excluding arrows) that's being shown on the pagination component. */
  visibleNumberOfNumberBoxes;
  /** Indicates whether there are too many numbers to the left-hand side of the current page. */
  isLeftOverflow;
  /** Indicates whether there are too many numbers to the right-hand side of the current page. */
  isRightOverflow;

  //#region SelectedPageNumber
  @Output() public selectedPageNumberChange = new EventEmitter<number>();
  //#endregion

  onSelectPage(event: MouseEvent, page: number) {
    this.selectedPageNumberSignal.set(page);
    return false;
  }

  onPrevious() {
    const pageNumbers = this.pageNumbersSignal();
    const selectedPageNumber = this.selectedPageNumberSignal();
    const index = pageNumbers.indexOf(selectedPageNumber);
    if (index > 0) {
      const newValue = pageNumbers[index - 1];
      this.selectedPageNumberSignal.set(newValue);
    } else {
      this.selectedPageNumberSignal.set(pageNumbers[0]);
    }
    return false;
  }

  onNext() {
    const pageNumbers = this.pageNumbersSignal();
    const selectedPageNumber = this.selectedPageNumberSignal();
    const index = pageNumbers.indexOf(selectedPageNumber);
    if (index < 0) {
      this.selectedPageNumberSignal.set(pageNumbers[pageNumbers.length - 1]);
    } else if (index < pageNumbers.length - 1) {
      this.selectedPageNumberSignal.set(pageNumbers[index + 1]);
    } else {
      this.selectedPageNumberSignal.set(pageNumbers[pageNumbers.length - 1]);
    }
    return false;
  }
}
