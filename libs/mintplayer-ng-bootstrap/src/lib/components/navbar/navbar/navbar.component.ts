import { Component, ElementRef, HostListener, Input, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { BehaviorSubject, combineLatest, debounceTime, filter, map, Observable, Subject, take, takeUntil } from 'rxjs';
import { Breakpoint } from '../../../types/breakpoint';

@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
})
export class BsNavbarComponent implements OnDestroy {

  constructor() {
    this.expandAt$ = this.breakPoint$
      .pipe(map((breakpoint) => {
        switch (breakpoint) {
          case 'xxl': return 1400;
          case 'xl': return 1200;
          case 'lg': return 992;
          case 'md': return 768;
          case 'sm': return 576;
          case 'xs': return 0;
          default: return null;
        }
      }));

    this.isSmallMode$ = combineLatest([this.expandAt$, this.windowWidth$])
      .pipe(filter(([expandAt, windowWidth]) => {
        return windowWidth !== null;
      }))
      .pipe(map(([expandAt, windowWidth]) => {
        if (windowWidth === null) {
          throw 'windowWidth should not be null here';
        } else if (!expandAt) {
          return true;
        } else if (windowWidth >= expandAt) {
          return false;
        } else {
          return true;
        }
      }));

    this.windowWidth$
      .pipe(debounceTime(300), takeUntil(this.destroyed$))
      .subscribe(() => {
        this.isResizing$.next(false);
      });

    this.onWindowResize();

    this.expandClass$ = this.breakPoint$.pipe(map((breakpoint) => {
      return `navbar-expand-${breakpoint}`;
    }));
    this.wAutoClass$ = this.breakPoint$.pipe(map((breakpoint) => {
      return `w-${breakpoint}-auto`;
    }));
    this.dNoneClass$ = this.breakPoint$.pipe(map((breakpoint) => {
      return `d-${breakpoint}-none`;
    }));
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.isResizing$.next(true);
    if (typeof window !== 'undefined') {
      this.windowWidth$.next(window.innerWidth);
    }
  }

  @ViewChild('nav') nav!: ElementRef;
  @Input() autoclose = true;

  expandButtonTemplate: TemplateRef<any> | null = null;
  
  
  expandClass$: Observable<string>;
  wAutoClass$: Observable<string>;
  dNoneClass$: Observable<string>;
  isExpanded$ = new BehaviorSubject<boolean>(false);
  windowWidth$ = new BehaviorSubject<number | null>(null);
  isResizing$ = new BehaviorSubject<boolean>(false);
  expandAt$: Observable<number | null>;
  isSmallMode$: Observable<boolean>;
  destroyed$ = new Subject();

  toggleExpanded() {
    this.isExpanded$.pipe(take(1)).subscribe((isExpanded) => {
      this.isExpanded$.next(!isExpanded);
    });
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }

  //#region Breakpoint
  breakPoint$ = new BehaviorSubject<Breakpoint | null>('md');
  public get breakpoint() {
    return this.breakPoint$.value;
  }
  @Input() public set breakpoint(value: Breakpoint | null) {
    this.breakPoint$.next(value);
  }
  //#endregion

  
}
