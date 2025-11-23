import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, computed, signal } from '@angular/core';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any, private zone: NgZone) {
    if (!isPlatformServer(this.platformId) && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        // console.log('resized', entries[0].contentRect);
        this.zone.run(() => this.size.set(entries[0].contentRect));
      });
    }
  }

  private observer?: ResizeObserver;
  size = signal<Size | undefined>(undefined);
  width = computed(() => this.size()?.width);
  height = computed(() => this.size()?.height);

  ngAfterViewInit() {
    const el: HTMLElement = this.element.nativeElement;
    this.observer?.observe(el);
    this.size.set({ width: el.clientWidth, height: el.clientHeight });
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.unobserve(this.element.nativeElement);
      this.observer.disconnect();
    }
  }
}
