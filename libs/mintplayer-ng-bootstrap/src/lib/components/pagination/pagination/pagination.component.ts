import {
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
} from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  map,
  Observable,
  Subject,
  takeUntil,
} from 'rxjs';
import { PageWithSelection } from '../../../interfaces/page-with-selection';

@Component({
  selector: 'bs-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.scss'],
})
export class BsPaginationComponent implements OnDestroy {
  constructor() {
    this.destroyed$ = new Subject();

    this.visibleNumberOfNumberBoxes$ = combineLatest([
      this.numberOfBoxes$,
      this.pageNumbers$,
      this.showArrows$,
    ])
      .pipe(takeUntil(this.destroyed$))
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

    this.shownPageNumbers$ = combineLatest([
      this.pageNumbers$,
      this.selectedPageNumber$,
      this.visibleNumberOfNumberBoxes$,
    ])
      .pipe(takeUntil(this.destroyed$))
      .pipe(
        map(([pageNumbers, selectedPageNumber, visibleNumberOfNumberBoxes]) => {
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
      .pipe(takeUntil(this.destroyed$))
      .pipe(
        map(([pageNumbers, selectedPageNumber]) => {
          return pageNumbers.indexOf(selectedPageNumber) === 0;
        })
      );

    this.isLastPage$ = combineLatest([
      this.pageNumbers$,
      this.selectedPageNumber$,
    ])
      .pipe(takeUntil(this.destroyed$))
      .pipe(
        map(([pageNumbers, selectedPageNumber]) => {
          return (pageNumbers.indexOf(selectedPageNumber) === pageNumbers.length - 1);
        })
      );

    this.selectedPageNumber$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((selectedPageNumber) => {
        this.selectedPageNumberChange.emit(selectedPageNumber);
      });
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

  /** Indicates if first value is selected. */
  isFirstPage$ = new Observable<boolean>();
  /** Indicates if last value is selected. */
  isLastPage$ = new Observable<boolean>();
  /** The number of boxes (excluding arrows) that's being shown on the pagination component. */
  visibleNumberOfNumberBoxes$ = new Observable<number>();
  /** Monitor OnDestroyed hook. */
  private destroyed$: Subject<any>;

  private _selectedPageNumber = 0;
  private _numberOfBoxes = 0;
  private _pageNumbers: number[] = [];
  private _showArrows = true;

  //#region SelectedPageNumber
  @Output() public selectedPageNumberChange = new EventEmitter<number>();
  @Input() set selectedPageNumber(value: number) {
    this._selectedPageNumber = value;
    this.selectedPageNumber$.next(value);
  }
  get selectedPageNumber() {
    return this._selectedPageNumber;
  }
  //#endregion

  //#region NumberOfBoxes
  @Input() set numberOfBoxes(value: number) {
    this._numberOfBoxes = value;
    this.numberOfBoxes$.next(value);
  }
  get numberOfBoxes() {
    return this._numberOfBoxes;
  }
  //#endregion

  //#region PageNumbers
  @Input() set pageNumbers(value: number[]) {
    this._pageNumbers = value;
    this.pageNumbers$.next(value);
  }
  get pageNumbers() {
    return this._pageNumbers;
  }
  //#endregion

  //#region ShowArrows
  @Input() set showArrows(value: boolean) {
    this._showArrows = value;
    this.showArrows$.next(value);
  }
  get showArrows() {
    return this._showArrows;
  }
  //#endregion

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  onSelectPage(event: MouseEvent, page: number) {
    this.selectedPageNumber$.next(page);
    return false;
  }

  onPrevious() {
    this.selectedPageNumber$.next(this.selectedPageNumber$.value - 1);
    return false;
  }

  onNext() {
    this.selectedPageNumber$.next(this.selectedPageNumber$.value + 1);
    return false;
  }
}
