import { Component, EventEmitter, Inject, Input, OnDestroy, Output, TemplateRef } from '@angular/core';
import { BehaviorSubject, combineLatest, delayWhen, interval, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { FadeInOutAnimation } from '@mintplayer/ng-animations';
import { OffcanvasPosition } from '../../types/position';
import { OFFCANVAS_CONTENT } from '../../providers/offcanvas-content.provider';

@Component({
  selector: 'bs-offcanvas-holder',
  templateUrl: './offcanvas.component.html',
  styleUrls: ['./offcanvas.component.scss'],
  animations: [FadeInOutAnimation]
})
export class BsOffcanvasComponent implements OnDestroy {

  constructor(@Inject(OFFCANVAS_CONTENT) contentTemplate: TemplateRef<any>) {
    this.contentTemplate = contentTemplate;

    this.visibility$ = this.show$
      .pipe(delayWhen((val, i) => val ? of(0) : interval(300)))
      .pipe(map((val) => val ? 'visible' : 'hidden'));

    this.position$
      .pipe(takeUntil(this.destroyed$))
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

    this.showBackdrop$ = combineLatest([this.hasBackdrop$, this.show$])
      .pipe(map(([hasBackdrop, show]) => hasBackdrop && show));
  }

  contentTemplate: TemplateRef<any>;
  
  destroyed$ = new Subject();
  visibility$: Observable<string>;
  disableTransition$ = new BehaviorSubject<boolean>(false);
  offcanvasClass$ = new BehaviorSubject<string | null>(null);
  width$: Observable<number | null>;
  height$: Observable<number | null>;
  hasBackdrop$ = new BehaviorSubject<boolean>(false);
  showBackdrop$: Observable<boolean>;

  //#region Position
  position$ = new BehaviorSubject<OffcanvasPosition>('bottom');
  @Input() public set position(value: OffcanvasPosition) {
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

  //#region Show
  show$ = new BehaviorSubject<boolean>(false);
  @Output() public showChange = new EventEmitter<boolean>();
  @Input() public set show(value: boolean) {
    this.show$.next(value);
  }
  public get show() {
    return this.show$.value;
  }
  //#endregion

  @Output() backdropClick = new EventEmitter<MouseEvent>();
  onBackdropClick(ev: MouseEvent) {
    console.log(1);
    this.backdropClick.emit(ev);
  }
  
  ngOnDestroy() {
    this.destroyed$.next(true);
  }

}
