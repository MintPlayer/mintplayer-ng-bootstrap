import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy, PLATFORM_ID } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[navbarContent]'
})
export class NavbarContentDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any) {
    if (!isPlatformServer(platformId)) {
      this.resizeObserver = new ResizeObserver((entries) => {
        const height = entries[0].contentRect.height;
        this.element.nativeElement.style.paddingTop = (this.initialPadding + height) + 'px';
      });
    } else {
      this.resizeObserver = null;
    }
  }

  resizeObserver: ResizeObserver | null;
  initialPadding = 0;

  @Input('navbarContent') navbar!: BsNavbarComponent;

  ngAfterViewInit() {
    const pt = parseInt(this.element.nativeElement.style.paddingTop.replace(/px$/, ''));
    this.initialPadding = isNaN(pt) ? 0 : pt;
    if (this.resizeObserver) {
      this.resizeObserver.observe(this.navbar.nav.nativeElement);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.unobserve(this.navbar.nav.nativeElement);
    }
  }
}
