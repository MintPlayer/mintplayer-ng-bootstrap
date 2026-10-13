import { isPlatformServer } from '@angular/common';
import { AfterViewInit, computed, Directive, ElementRef, inject, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { Size } from './size';

/**
 * The element's content-box size, fractional: the same quantity a ResizeObserver reports as
 * `contentRect`, so the first value matches every later one. `clientWidth` would not: it is an
 * integer and includes the padding, so a padded element jumped by its padding on the first
 * observation, and a sub-pixel width flipped by a rounding step (issue #428).
 */
export function contentBoxSize(el: HTMLElement): Size {
  const cs = getComputedStyle(el);
  const px = (...values: string[]) => values.reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const paddingX = px(cs.paddingLeft, cs.paddingRight);
  const paddingY = px(cs.paddingTop, cs.paddingBottom);
  const borderBox = cs.boxSizing === 'border-box';
  const axis = (used: string, client: number, padding: number, border: number) => {
    const value = parseFloat(used);
    // `auto` for a non-replaced inline element: fall back to the integer client size.
    if (Number.isNaN(value)) return Math.max(0, client - padding);
    return Math.max(0, borderBox ? value - padding - border : value);
  };
  return {
    width: axis(cs.width, el.clientWidth, paddingX, px(cs.borderLeftWidth, cs.borderRightWidth)),
    height: axis(cs.height, el.clientHeight, paddingY, px(cs.borderTopWidth, cs.borderBottomWidth)),
  };
}

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
    // The server has no layout (and no getComputedStyle): leave the size unmeasured.
    if (isPlatformServer(this.platformId)) return;
    const el: HTMLElement = this.element.nativeElement;
    this.observer?.observe(el);
    this.size.set(contentBoxSize(el));
  }

  ngOnDestroy() {
    if (this.observer) {
      this.observer.unobserve(this.element.nativeElement);
      this.observer.disconnect();
    }
  }
}