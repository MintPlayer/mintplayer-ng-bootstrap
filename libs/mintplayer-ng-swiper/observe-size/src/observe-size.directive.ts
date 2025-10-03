import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, inject, Inject, NgZone, OnDestroy, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, Observable, Subject, map } from 'rxjs';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  standalone: true,
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  element = inject(ElementRef);
  platformId = inject(PLATFORM_ID)
  zone = inject(NgZone);
  constructor() {
    if (!isPlatformServer(this.platformId)) {
      this.observer = new ResizeObserver((entries) => {
        // console.log('resized', entries[0].contentRect);
        this.zone.run(() => this.size$.next(entries[0].contentRect));
      });
    }

    this.width$ = this.size$.pipe(map(size => size?.width));
    this.height$ = this.size$.pipe(map(size => size?.height));
  }

  private observer?: ResizeObserver;
  size$ = new BehaviorSubject<Size | undefined>(undefined);
  width$: Observable<number | undefined>;
  height$: Observable<number | undefined>;

  ngAfterViewInit() {
    const el: HTMLElement = this.element.nativeElement;
    this.observer?.observe(el);
    this.size$.next({ width: el.clientWidth, height: el.clientHeight });
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.unobserve(this.element.nativeElement);
      this.observer.disconnect();
    }
  }
}