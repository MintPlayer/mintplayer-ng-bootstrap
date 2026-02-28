import { isPlatformServer } from '@angular/common';
import { AfterViewInit, computed, Directive, ElementRef, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { Size } from './size';

@Directive({
  selector: '[bsObserveSize]',
  exportAs: 'bsObserveSize'
})
export class BsObserveSizeDirective implements AfterViewInit, OnDestroy {
  private element = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  private observer?: ResizeObserver;

  constructor() {
    if (!isPlatformServer(this.platformId) && typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver((entries) => {
        this.size.set(entries[0].contentRect);
      });
    }
  }

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