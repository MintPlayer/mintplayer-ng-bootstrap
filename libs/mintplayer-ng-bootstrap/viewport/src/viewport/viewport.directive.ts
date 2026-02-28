import { AfterViewInit, Directive, ElementRef, inject, OnDestroy, output, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';

@Directive({
  selector: '[bsInViewport]',
})
export class BsInViewportDirective implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;
  private isDestroyed = false;

  readonly bsInViewport = output<boolean>();

  ngAfterViewInit() {
    if (isPlatformServer(this.platformId)) {
      return;
    }

    this.observer = new IntersectionObserver((entries) => {
      if (!this.isDestroyed) {
        for (const entry of entries) {
          this.bsInViewport.emit(entry.isIntersecting);
        }
      }
    });

    this.observer.observe(this.elementRef.nativeElement);
  }

  ngOnDestroy() {
    this.isDestroyed = true;
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
