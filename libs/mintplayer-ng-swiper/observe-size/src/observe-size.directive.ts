import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, NgZone, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  constructor() {
    if (!isPlatformServer(this.platformId) && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        console.log('resized', entries[0].contentRect);
        this.size.set(entries[0].contentRect);
      });
    }
  }

  element = inject(ElementRef);
  platformId = inject(PLATFORM_ID);
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
