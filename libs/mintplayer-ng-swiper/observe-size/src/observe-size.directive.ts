import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  standalone: true,
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any, private zone: NgZone) {
    if (!isPlatformServer(this.platformId)) {
      this.observer = new ResizeObserver((entries) => {
        this.zone.run(() => this.size$.next(entries[0].contentRect));
      });
    }

    this.width$ = this.size$.pipe(map(size => size.width));
    this.height$ = this.size$.pipe(map(size => size.height));
  }

  private observer?: ResizeObserver;
  size$ = new BehaviorSubject<Size>({});
  width$: Observable<number | undefined>;
  height$: Observable<number | undefined>;

  ngAfterViewInit() {
    // console.log('el', this.element.nativeElement);
    this.observer?.observe(this.element.nativeElement);
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.unobserve(this.element.nativeElement);
      this.observer.disconnect();
    }
  }
}