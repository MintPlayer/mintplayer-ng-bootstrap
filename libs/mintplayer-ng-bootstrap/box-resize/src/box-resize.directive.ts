import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, combineLatest, map, takeUntil } from 'rxjs';

@Directive({
  selector: '[bsBoxResize]'
})
export class BsBoxResizeDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries, observer) => {
      console.log('resized', entries);
      this.contentRect$.next(entries[0].contentRect);
    });

    this.borderLeft$ = combineLatest([this.contentRect$, this.mousePos$])
      .pipe(map(([contentRect, mousePos]) => {
        if (mousePos) {
          return mousePos.x < 5;
        } else {
          return false;
        }
      }));
      
    this.borderRight$ = combineLatest([this.contentRect$, this.mousePos$])
      .pipe(map(([contentRect, mousePos]) => {
        if (mousePos && contentRect) {
          return mousePos.x > contentRect.width - 5;
        } else {
          return false;
        }
      }));

    this.borderTop$ = combineLatest([this.contentRect$, this.mousePos$])
      .pipe(map(([contentRect, mousePos]) => {
        if (mousePos) {
          return mousePos.y < 5;
        } else {
          return false;
        }
      }));
      
    this.borderBottom$ = combineLatest([this.contentRect$, this.mousePos$])
      .pipe(map(([contentRect, mousePos]) => {
        if (mousePos && contentRect) {
          return mousePos.y > contentRect.height - 5;
        } else {
          return false;
        }
      }));

    this.cursor$ = combineLatest([this.borderLeft$, this.borderRight$, this.borderTop$, this.borderBottom$])
      .pipe(takeUntil(this.destroyed$))
      .pipe(map(([borderLeft, borderRight, borderTop, borderBottom]) => {
        if (borderLeft) {
          if (borderTop) {
            return 'nw-resize';
          } else if (borderBottom) {
            return 'sw-resize';
          } else {
            return 'w-resize';
          }
        } else if (borderRight) {
          if (borderTop) {
            return 'ne-resize';
          } else if (borderBottom) {
            return 'se-resize';
          } else {
            return 'e-resize';
          }
        } else {
          if (borderTop) {
            return 'n-resize';
          } else if (borderBottom) {
            return 's-resize';
          } else {
            return null;
          }
        }
      }));
    
    this.cursor$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((cursor) => this.cursor = cursor);
  }

  resizeObserver: ResizeObserver;
  contentRect$ = new BehaviorSubject<DOMRect | null>(null);
  mousePos$ = new BehaviorSubject<{x: number, y: number} | null>(null);
  borderLeft$: Observable<boolean>;
  borderRight$: Observable<boolean>;
  borderTop$: Observable<boolean>;
  borderBottom$: Observable<boolean>;
  cursor$: Observable<string | null>;
  destroyed$ = new Subject();

  ngAfterViewInit() {
    this.resizeObserver.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.unobserve(this.element.nativeElement);
    this.resizeObserver.disconnect();
    this.destroyed$.next(true);
  }

  @HostBinding('style.cursor') cursor: string | null = null;
  @HostListener('mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    this.mousePos$.next({ x: ev.offsetX, y: ev.offsetY });
  }

  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    
  }

}
