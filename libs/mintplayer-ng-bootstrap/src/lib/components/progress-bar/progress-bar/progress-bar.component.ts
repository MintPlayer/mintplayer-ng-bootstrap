import { Component, HostBinding, Input, OnDestroy } from '@angular/core';
import { Color } from '../../../enums/color.enum';
import { BehaviorSubject, combineLatest, map, Observable, Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'bs-progress-bar',
  templateUrl: './progress-bar.component.html',
  styleUrls: ['./progress-bar.component.scss']
})
export class BsProgressBarComponent implements OnDestroy {

  constructor() {
    this.percentage$ = combineLatest([this.minimum$, this.maximum$, this.value$])
      .pipe(map(([minimum, maximum, value]) => {
        return (value - minimum) / (maximum - minimum) * 100;
      }));
    this.width$ = this.percentage$
      .pipe(map((width) => {
        return String(width) + '%';
      }));
    this.colorClass$ = this.color$
      .pipe(map((color) => {
        const name = Color[color];
        return `bg-${name}`;
      }));

    this.colorClass$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((color) => {
        this.colorClass = color;
      });
    this.width$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((width) => {
        this.widthStyle = width;
      });
    this.value$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((value) => {
        this.valueNow = value;
      });
    this.minimum$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((value) => {
        this.valueMin = value;
      });
    this.maximum$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((value) => {
        this.valueMax = value;
      });
  }

  destroyed$ = new Subject()
  minimum$ = new BehaviorSubject<number>(0);
  maximum$ = new BehaviorSubject<number>(100);
  value$ = new BehaviorSubject<number>(50);
  percentage$: Observable<number>;
  width$: Observable<string>;
  color$ = new BehaviorSubject<Color>(Color.primary);
  colorClass$: Observable<string>;

  @Input() public set minimum(value: number) {
    this.minimum$.next(value);
  }
  @Input() public set maximum(value: number) {
    this.maximum$.next(value);
  }
  @Input() public set value(value: number) {
    this.value$.next(value);
  }
  @Input() public set color(value: Color) {
    this.color$.next(value);
  }
  @Input() @HostBinding('class.progress-bar-striped') public striped = false;
  @Input() @HostBinding('class.progress-bar-animated') public animated = false;

  @HostBinding('class.progress-bar') progressBar = true;
  @HostBinding('class') colorClass = 'bg-primary';
  @HostBinding('style.width') widthStyle = '0';
  @HostBinding('attr.role') role = 'progressbar';
  @HostBinding('attr.aria-valuenow') valueNow = 50;
  @HostBinding('attr.aria-valuemin') valueMin = 0;
  @HostBinding('attr.aria-valuemax') valueMax = 100;

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
