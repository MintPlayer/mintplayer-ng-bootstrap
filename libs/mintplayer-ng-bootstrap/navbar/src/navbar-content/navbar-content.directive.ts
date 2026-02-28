import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, effect, ElementRef, inject, input, OnDestroy, PLATFORM_ID, signal } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[bsNavbarContent]',
  standalone: false,
})
export class BsNavbarContentDirective implements AfterViewInit, OnDestroy {

  private element = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);

  navbar = input<BsNavbarComponent | undefined>(undefined, { alias: 'bsNavbarContent' });
  private viewInit = signal<boolean>(false);
  resizeObserver: ResizeObserver | null = null;
  initialPadding = 0;

  constructor() {
    effect(() => {
      const viewInit = this.viewInit();
      const navbar = this.navbar();

      if (viewInit && navbar) {
        if (isPlatformServer(this.platformId)) {
          this.element.nativeElement.style.paddingTop = (this.initialPadding + 58) + 'px';
        } else {
          this.resizeObserver = new ResizeObserver((entries) => {
            const height = navbar.nav().nativeElement.offsetHeight;
            this.element.nativeElement.style.paddingTop = (this.initialPadding + height) + 'px';
          });

          const px = getComputedStyle(this.element.nativeElement).getPropertyValue('padding-top');
          const pt = parseInt(px.replace(/px$/, ''));
          this.initialPadding = isNaN(pt) ? 0 : pt;
          if (this.resizeObserver && navbar) {
            this.resizeObserver.observe(navbar.nav().nativeElement);
          }
        }
      }
    });
  }

  ngAfterViewInit() {
    this.viewInit.set(true);
  }

  ngOnDestroy() {
    const navbar = this.navbar();
    if (navbar) {
      this.resizeObserver?.unobserve(navbar.nav().nativeElement);
    }
  }
}
