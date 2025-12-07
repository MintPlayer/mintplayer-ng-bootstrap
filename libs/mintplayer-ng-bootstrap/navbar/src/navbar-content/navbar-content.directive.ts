import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy, PLATFORM_ID, signal, effect } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[bsNavbarContent]',
  standalone: false,
})
export class BsNavbarContentDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any) {
    effect(() => {
      const viewInit = this.viewInitSignal();
      const navbar = this.navbarSignal();
      if (viewInit && navbar) {
        if (isPlatformServer(platformId)) {
          this.element.nativeElement.style.paddingTop = (this.initialPadding + 58) + 'px';
        } else {
          // Initialize the ResizeObserver
          this.resizeObserver = new ResizeObserver((entries) => {
            const height = navbar
              ? navbar.nav.nativeElement.offsetHeight
              : entries[0].contentRect.height;

            this.element.nativeElement.style.paddingTop = (this.initialPadding + height) + 'px';
          });

          // Monitor the size
          const px = getComputedStyle(this.element.nativeElement).getPropertyValue('padding-top');
          const pt = parseInt(px.replace(/px$/, ''));
          this.initialPadding = isNaN(pt) ? 0 : pt;
          if (this.resizeObserver && navbar) {
            this.resizeObserver.observe(navbar.nav.nativeElement);
          }
        }
      }
    }, { allowSignalWrites: true });
  }

  private viewInitSignal = signal<boolean>(false);
  private navbarSignal = signal<BsNavbarComponent | undefined>(undefined);
  resizeObserver: ResizeObserver | null = null;
  initialPadding = 0;

  @Input('bsNavbarContent') set navbar(value: BsNavbarComponent | undefined) {
    this.navbarSignal.set(value);
  }

  ngAfterViewInit() {
    this.viewInitSignal.set(true);
  }

  ngOnDestroy() {
    this.resizeObserver?.unobserve(this.navbarSignal()?.nav.nativeElement);
  }
}
