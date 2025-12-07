import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, signal, computed } from '@angular/core';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  standalone: true,
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any, private zone: NgZone) {
    if (!isPlatformServer(this.platformId) && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        this.zone.run(() => this.size.set(entries[0].contentRect));
      });
    }

    this.width = computed(() => this.size()?.width);
    this.height = computed(() => this.size()?.height);
  }

  private observer?: ResizeObserver;
  size = signal<Size | undefined>(undefined);
  width;
  height;

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
