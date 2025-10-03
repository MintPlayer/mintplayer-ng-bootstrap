import { Component, EventEmitter, inject, Inject, Input, Output, TemplateRef } from '@angular/core';
import { BehaviorSubject, combineLatest, delayWhen, interval, map, Observable, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { Position } from '@mintplayer/ng-bootstrap';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Component({
  selector: 'bs-offcanvas-holder',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  standalone: false,
  animations: [FadeInOutAnimation],
})
export class BsOffcanvasComponent {

  constructor() {
    this.visibility$ = this.isVisible$
      .pipe(delayWhen((val, i) => val ? of(0) : interval(300)))
      .pipe(map((val) => val ? 'visible' : 'hidden'));

    this.position$
      .pipe(takeUntilDestroyed())
      .subscribe((position) => {
        this.disableTransition$.next(true);
        this.offcanvasClass$.next(`offcanvas-${position}`);
        setTimeout(() => this.disableTransition$.next(false));
      });

    this.width$ = combineLatest([this.position$, this.size$])
      .pipe(map(([position, size]) => {
        if (['start', 'end'].includes(position)) {
          return size;
        } else {
          return null;
        }
      }));

    this.height$ = combineLatest([this.position$, this.size$])
      .pipe(map(([position, size]) => {
        if (['top', 'bottom'].includes(position)) {
          return size;
        } else {
          return null;
        }
      }));
    
    this.overflowClass$ = this.position$
      .pipe(map((position) => {
        if (['top', 'bottom'].includes(position)) {
          return 'overflow-y-hidden';
        } else {
          return 'overflow-x-hidden';
        }
      }))

    this.showBackdrop$ = combineLatest([this.hasBackdrop$, this.isVisible$])
      .pipe(map(([hasBackdrop, isVisible]) => hasBackdrop && isVisible));

    this.show$ = this.isVisible$
      .pipe(map((isVisible) => isVisible === true));
  }

  contentTemplate = inject(OFFCANVAS_CONTENT);
  
  visibility$: Observable<string>;
  disableTransition$ = new BehaviorSubject<boolean>(false);
  offcanvasClass$ = new BehaviorSubject<string | null>(null);
  overflowClass$: Observable<string | null>;
  width$: Observable<number | null>;
  height$: Observable<number | null>;
  hasBackdrop$ = new BehaviorSubject<boolean>(false);
  show$: Observable<boolean>;
  showBackdrop$: Observable<boolean>;

  //#region Position
  position$ = new BehaviorSubject<Position>('bottom');
  @Input() public set position(value: Position) {
    this.position$.next(value);
  }
  public get position() {
    return this.position$.value;
  }
  //#endregion

  //#region Size
  size$ = new BehaviorSubject<number | null>(null);
  @Input() public set size(value: number | null) {
    this.size$.next(value);
  }
  public get size() {
    return this.size$.value;
  }
  //#endregion

  //#region IsVisible
  isVisible$ = new BehaviorSubject<boolean>(false);
  @Output() public isVisibleChange = new EventEmitter<boolean>();
  @Input() public set isVisible(value: boolean) {
    this.isVisible$.next(value);
  }
  public get isVisible() {
    return this.isVisible$.value;
  }
  //#endregion

  @Output() backdropClick = new EventEmitter<MouseEvent>();
  onBackdropClick(ev: MouseEvent) {
    this.backdropClick.emit(ev);
  }

}
