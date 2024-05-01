import { AfterViewInit, Directive, ElementRef, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Directive({
  selector: '[bsObserveSize]',
  standalone: true,
  exportAs: 'bsObserveSize'
})
export class ObserveSizeDirective implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef) {
    this.observer = new ResizeObserver((entries) => {
      const size = entries[0].contentRect;
      this.width$.next(size.width);
      this.height$.next(size.height);
    });
  }

  observer: ResizeObserver;
  width$ = new BehaviorSubject<number | undefined>(undefined);
  height$ = new BehaviorSubject<number | undefined>(undefined);

  ngAfterViewInit() {
    this.observer.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    this.observer.unobserve(this.element.nativeElement);
  }
}
