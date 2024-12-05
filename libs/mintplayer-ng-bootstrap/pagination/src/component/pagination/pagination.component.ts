import { Component, EventEmitter, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Size } from '@mintplayer/ng-bootstrap';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';
import { PageWithSelection } from '../../interfaces/page-with-selection';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'bs-pagination',
  standalone: true,
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
  imports: [AsyncPipe],
})
export class BsPaginationComponent {
  constructor() {
    this.visibleNumberOfNumberBoxes$ = combineLatest([
      this.numberOfBoxes$,
      this.pageNumbers$,
      this.showArrows$,
    ])
      .pipe(takeUntilDestroyed())
      .pipe(
        map(([numberOfBoxes, pageNumbers, showArrows]) => {
          if (numberOfBoxes <= 0) {
            return pageNumbers.length;
          } else if (!showArrows) {
            return Math.min(numberOfBoxes, pageNumbers.length);
          } else if (numberOfBoxes <= 2) {
            return Math.min(1, pageNumbers.length);
          } else {
            return Math.min(numberOfBoxes - 2, pageNumbers.length);
          }
        })
      );

    this.isLeftOverflow$ = combineLatest([this.pageNumbers$, this.selectedPageNumber$, this.visibleNumberOfNumberBoxes$])
      .pipe(map(([pageNumbers, selectedPageNumber, visibleNumberOfNumberBoxes]) => {
        const index = pageNumbers.indexOf(selectedPageNumber);
        const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
        return index > middle;
      }));

    this.isRightOverflow$ = combineLatest([this.pageNumbers$, this.selectedPageNumber$, this.visibleNumberOfNumberBoxes$])
      .pipe(map(([pageNumbers, selectedPageNumber, visibleNumberOfNumberBoxes]) => {
        const index = pageNumbers.indexOf(selectedPageNumber);
        const middle = Math.floor(visibleNumberOfNumberBoxes / 2);
        return (pageNumbers.length - index) < middle;
      }));

    this.shownPageNumbers$ = combineLatest([
      this.pageNumbers$,
      this.selectedPageNumber$,
      this.visibleNumberOfNumberBoxes$,
      this.isLeftOverflow$,
      this.isRightOverflow$
    ])
      .pipe(takeUntilDestroyed())
      .pipe(
        map(([pageNumbers, selectedPageNumber, visibleNumberOfNumberBoxes, isLeftOverflow, isRightOverflow]) => {
          // const boxesToRemove = pageNumbers.length - visibleNumberOfNumberBoxes
          //   + (isLeftOverflow ? 1 : 0)
          //   + (isRightOverflow ? 1 : 0);

          // let result: number[] = [];
          // result.push(pageNumbers[0]);

          // // ...

          // result.push(pageNumbers[pageNumbers.length - 1]);

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
            .map((p) =><PageWithSelection>{
              page: pageNumbers[p],
              selected: pageNumbers[p] === selectedPageNumber,
            });
        })
      );

    this.isFirstPage$ = combineLatest([
      this.pageNumbers$,
      this.selectedPageNumber$,
    ])
    .pipe(takeUntilDestroyed())
    .pipe(map(([pageNumbers, selectedPageNumber]) => pageNumbers.indexOf(selectedPageNumber) === 0));

    this.isLastPage$ = combineLatest([
      this.pageNumbers$,
      this.selectedPageNumber$,
    ])
      .pipe(takeUntilDestroyed())
      .pipe(map(([pageNumbers, selectedPageNumber]) => pageNumbers.indexOf(selectedPageNumber) === pageNumbers.length - 1));

    this.selectedPageNumber$.pipe(takeUntilDestroyed())
      .subscribe(selectedPageNumber => this.selectedPageNumberChange.emit(selectedPageNumber));
  }

  /** All page numbers. */
  pageNumbers$ = new BehaviorSubject<number[]>([]);
  /** Page numbers to be displayed to the user. */
  shownPageNumbers$: Observable<PageWithSelection[]>;
  /** Selected number. */
  selectedPageNumber$ = new BehaviorSubject<number>(1);
  /** Number of boxes. */
  numberOfBoxes$ = new BehaviorSubject<number>(0);
  /** Display previous/next arrows. */
  showArrows$ = new BehaviorSubject<boolean>(true);
  /** Page number size. */
  size$ = new BehaviorSubject<Size>('medium');

  /** Indicates if first value is selected. */
  isFirstPage$: Observable<boolean>;
  /** Indicates if last value is selected. */
  isLastPage$: Observable<boolean>;
  /** The number of boxes (excluding arrows) that's being shown on the pagination component. */
  visibleNumberOfNumberBoxes$: Observable<number>;
  /** Indicates whether there are too many numbers to the left-hand side of the current page. */
  isLeftOverflow$: Observable<boolean>;
  /** Indicates whether there are too many numbers to the right-hand side of the current page. */
  isRightOverflow$: Observable<boolean>;

  //#region SelectedPageNumber
  @Output() public selectedPageNumberChange = new EventEmitter<number>();
  @Input() set selectedPageNumber(value: number) {
    this.selectedPageNumber$.next(value);
  }
  get selectedPageNumber() {
    return this.selectedPageNumber$.value;
  }
  //#endregion

  //#region NumberOfBoxes
  @Input() set numberOfBoxes(value: number) {
    this.numberOfBoxes$.next(value);
  }
  get numberOfBoxes() {
    return this.numberOfBoxes$.value;
  }
  //#endregion

  //#region PageNumbers
  @Input() set pageNumbers(value: number[]) {
    this.pageNumbers$.next(value);
  }
  get pageNumbers() {
    return this.pageNumbers$.value;
  }
  //#endregion

  //#region ShowArrows
  @Input() set showArrows(value: boolean) {
    this.showArrows$.next(value);
  }
  get showArrows() {
    return this.showArrows$.value;
  }
  //#endregion

  //#region Size
  @Input() set size(value: Size) {
    this.size$.next(value);
  }
  get size() {
    return this.size$.value;
  }
  //#endregion

  onSelectPage(event: MouseEvent, page: number) {
    this.selectedPageNumber$.next(page);
    return false;
  }

  onPrevious() {
    const index = this.pageNumbers.indexOf(this.selectedPageNumber);
    if (index > 0) {
      const newValue = this.pageNumbers[index - 1];
      this.selectedPageNumber$.next(newValue);
    } else {
      this.selectedPageNumber$.next(this.pageNumbers[0]);
    }
    return false;
  }

  onNext() {
    const index = this.pageNumbers.indexOf(this.selectedPageNumber);
    if (index < 0) {
      this.selectedPageNumber$.next(this.pageNumbers[this.pageNumbers.length - 1]);
    } else if (index < this.pageNumbers.length - 1) {
      this.selectedPageNumber$.next(this.pageNumbers[index + 1]);
    } else {
      this.selectedPageNumber$.next(this.pageNumbers[this.pageNumbers.length - 1]);
    }
    return false;
  }
}
