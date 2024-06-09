import { isPlatformServer } from "@angular/common";
import { AfterViewInit, Directive, ElementRef, EventEmitter, Inject, OnDestroy, Output, PLATFORM_ID } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { BehaviorSubject, Subject } from "rxjs";
import { BsViewPosition } from "./entered-view.event";

@Directive({
  selector: '[bsEnteredView]',
  standalone: true,
  exportAs: 'bsEnteredView'
})
export class BsEnteredViewDirective implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any) {
    this.viewPosition$.pipe(takeUntilDestroyed()).subscribe((ev) => {
      console.warn('position', ev);
      this.viewPositionChange.emit(ev);
    });
  }

  observer?: IntersectionObserver;
  viewPosition$ = new Subject<BsViewPosition>();
  lastY?: number;
  @Output() viewPositionChange = new EventEmitter<BsViewPosition>();

  ngAfterViewInit() {
    if (!isPlatformServer(this.platformId)) {
      this.observer = new IntersectionObserver((entries, options) => {
        const isInView = entries[0].isIntersecting;
        const newY = entries[0].boundingClientRect.y;
        const direction = (newY > (this.lastY || 0)) ? 'down' : 'up';

        const viewPosition: BsViewPosition = isInView
          ? 'visible'
          : (direction === 'up')
          ? 'above'
          : 'below';

        setTimeout(() => this.viewPosition$.next(viewPosition), 1);
        this.lastY = newY;
      }, {  });
      this.observer.observe(this.element.nativeElement);
    }
  }

  ngOnDestroy() {
    this.observer && this.observer.unobserve(this.element.nativeElement);
  }
}