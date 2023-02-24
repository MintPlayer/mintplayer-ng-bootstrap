import { AfterViewInit, Directive, ElementRef, HostBinding, HostListener, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subject, Observable, combineLatest, map, takeUntil, take, filter, debounceTime } from 'rxjs';
import { Point } from '../interfaces/point';
import { FixedEdge } from '../interfaces/fixed-edge';
import { ResizeInformation } from '../interfaces/resize-information';
import { XEdge, YEdge } from '../types/edge';

@Directive({
  selector: '[bsBoxResize]',
  exportAs: 'bsBoxResize'
})
export class BsBoxResizeDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries, observer) => {
      this.contentRect$.next(entries[0].contentRect);
    });
      
    this.offsetContentRect$ = this.contentRect$.pipe(map((contentRect) => {
      console.log('element', this.element.nativeElement);
      const dx = this.element.nativeElement.offsetLeft;
      const dy = this.element.nativeElement.offsetTop;
      return new DOMRect(contentRect?.x + dx, contentRect?.y + dy, contentRect?.width, contentRect?.height);
    }));

    this.borderLeft$ = combineLatest([this.offsetContentRect$, this.mousePos$])
      .pipe(map(([offsetContentRect, mousePos]) => {
        if (mousePos && offsetContentRect) {
          return mousePos.x < offsetContentRect.left + this.resizeMargin;
        } else {
          return false;
        }
      }));

    this.borderRight$ = combineLatest([this.offsetContentRect$, this.mousePos$])
      .pipe(map(([offsetContentRect, mousePos]) => {
        if (mousePos && offsetContentRect) {
          return mousePos.x > offsetContentRect.right - this.resizeMargin;
        } else {
          return false;
        }
      }));

    this.borderTop$ = combineLatest([this.offsetContentRect$, this.mousePos$])
      .pipe(map(([offsetContentRect, mousePos]) => {
        if (mousePos && offsetContentRect) {
          return mousePos.y < offsetContentRect.top + this.resizeMargin;
        } else {
          return false;
        }
      }));
      
    this.borderBottom$ = combineLatest([this.offsetContentRect$, this.mousePos$])
      .pipe(map(([offsetContentRect, mousePos]) => {
        if (mousePos && offsetContentRect) {
          return mousePos.y > offsetContentRect.bottom - this.resizeMargin;
        } else {
          return false;
        }
      }));

    this.edges$ = combineLatest([this.borderLeft$, this.borderRight$, this.borderTop$, this.borderBottom$])
      .pipe(map(([borderLeft, borderRight, borderTop, borderBottom]) => {
        const x = borderLeft
          ? 'left'
          : borderRight
          ? 'right'
          : null;

        const y = borderTop
          ? 'top'
          : borderBottom
          ? 'bottom'
          : null;

        return [x, y];
      }));
    
    this.cursor$ = this.edges$.pipe(map(edges => {
      switch (edges[0]) {
        case 'left':
          switch (edges[1]) {
            case 'top': return 'nw-resize';
            case 'bottom': return 'sw-resize';
            default: return 'w-resize';
          }
        case 'right':
          switch (edges[1]) {
            case 'top': return 'ne-resize';
            case 'bottom': return 'se-resize';
            default: return 'e-resize';
          }
        default:
          switch (edges[1]) {
            case 'top': return 'n-resize';
            case 'bottom': return 's-resize';
            default: return null;
          }
      }
    }));
    
    this.cursor$
      .pipe(takeUntil(this.destroyed$))
      .subscribe((cursor) => this.cursor = cursor);

    combineLatest([this.mousePos$, this.resizeInformation$])
      .pipe(filter(([mousePos, resizeInformation]) => !!resizeInformation), debounceTime(5))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([mousePos, resizeInformation]) => {
        if (mousePos && resizeInformation) {
          for (let edge of resizeInformation.fixedEdges) {
            if (edge.edge === 'left') {
              this.width = mousePos.x - (edge.position ?? 0) + 2; // + resizeInformation.delta.x;
            }
            if (edge.edge === 'top') {
              this.height = mousePos.y - (edge.position ?? 0) + 2; // + resizeInformation.delta.y;
            }
          }
        }
      });
    
  }

  resizeMargin = 8;
  resizeObserver: ResizeObserver;
  contentRect$ = new BehaviorSubject<DOMRect | null>(null);
  offsetContentRect$: Observable<DOMRect | null>;
  mousePos$ = new BehaviorSubject<Point | null>(null);
  borderLeft$: Observable<boolean>;
  borderRight$: Observable<boolean>;
  borderTop$: Observable<boolean>;
  borderBottom$: Observable<boolean>;
  edges$: Observable<[XEdge | null, YEdge | null]>
  cursor$: Observable<string | null>;
  resizeInformation$ = new BehaviorSubject<ResizeInformation | null>(null);
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
  @HostBinding('style.width.px') width: number | null = null;
  @HostBinding('style.height.px') height: number | null = null;

  @HostListener('mousedown', ['$event']) onMouseDown(ev: MouseEvent) {
    combineLatest([this.edges$, this.offsetContentRect$, this.mousePos$])
      .pipe(take(1))
      .subscribe(([edges, offsetContentRect, mousePos]) => {
        const fixedEdges: FixedEdge[] = [];
        switch (edges[0]) {
          case 'left':
            fixedEdges.push({ edge: 'right', position: offsetContentRect?.right });
            break;
          case 'right':
            fixedEdges.push({ edge: 'left', position: offsetContentRect?.left });
            break;
        }

        switch (edges[1]) {
          case 'top':
            fixedEdges.push({ edge: 'bottom', position: offsetContentRect?.bottom });
            break;
          case 'bottom':
            fixedEdges.push({ edge: 'top', position: offsetContentRect?.top });
            break;
        }

        console.log('fixedEdges', {fixedEdges, offsetContentRect});
        this.resizeInformation$.next({
          // startMousePosition: { x: ev.clientX, y: ev.clientY }, // Flicker
          // startMousePosition: { x: ev.offsetX, y: ev.offsetY }, // Shift
          startMousePosition: mousePos!,
          fixedEdges,
          // delta: { x: mousePos!.x - ev.clientX, y: mousePos!.y - ev.clientY },
        });
      });
  }

  @HostListener('window:mousemove', ['$event']) onMouseMove(ev: MouseEvent) {
    this.mousePos$.next({ x: ev.clientX, y: ev.clientY });
    // this.mousePos$.next({ x: ev.offsetX, y: ev.offsetY });
  }

  // Client - Client => shift
  // Offset - Offset => flicker Y
  // Client - Offset => flicker Y
  // Offset - Client => shift

  @HostListener('window:mouseup', ['$event']) onMouseUp(ev: Event) {
    this.resizeInformation$.next(null);
  }

}
