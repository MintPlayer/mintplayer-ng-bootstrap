import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BehaviorSubject, combineLatest, map, Observable } from 'rxjs';

@Component({
  selector: 'bs-rating',
  templateUrl: './rating.component.html',
  styleUrls: ['./rating.component.scss']
})
export class BsRatingComponent {

  constructor() {
    this.stars$ = combineLatest([this.maximum$, this.previewValue$, this.value$])
      .pipe(map(([maximum, previewValue, value]) => {
        const v = previewValue ?? value;
        return [
          ...[...Array(v).keys()].map(i => true),
          ...[...Array(maximum - v).keys()].map(i => false)
        ];
      }));

    combineLatest([this.previewValue$, this.value$])
      .pipe(takeUntilDestroyed())
      .subscribe(([previewValue, value]) => {
        const v = previewValue ?? value;
        this.starsChange.emit(v);
      });
  }

  maximum$ = new BehaviorSubject<number>(5);
  value$ = new BehaviorSubject<number>(3);
  previewValue$ = new BehaviorSubject<number | null>(null);
  stars$: Observable<boolean[]>;

  //#region Maximum
  @Input() public set maximum(value: number) {
    this.maximum$.next(value);
  }
  //#endregion

  //#region Value
  @Output() public valueChange = new EventEmitter<number>();
  @Output() public starsChange = new EventEmitter<number>();
  public get value() {
    return this.value$.value;
  }
  @Input() public set value(value: number) {
    this.value$.next(value);
    this.valueChange.emit(value);
  }
  //#endregion

  hoverValue(index: number) {
    this.previewValue$.next(index + 1);
  }
  selectValue(index: number) {
    this.value = index + 1;
  }

  @HostListener('mouseleave') onMouseLeave() {
    this.previewValue$.next(null);
  }
}
