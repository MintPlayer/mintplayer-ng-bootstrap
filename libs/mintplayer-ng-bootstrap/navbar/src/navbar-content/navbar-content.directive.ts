import { isPlatformServer } from '@angular/common';
import { AfterViewInit, Directive, ElementRef, Inject, Input, OnDestroy, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, combineLatest, filter, Subject, take, takeUntil } from 'rxjs';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[navbarContent]'
})
export class NavbarContentDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef, @Inject(PLATFORM_ID) private platformId: any) {
    combineLatest([this.viewInit$, this.navbar$])
      .pipe(filter(([viewInit, navbar]) => {
        return viewInit && !!navbar;
      }))
      .pipe(take(1))
      .pipe(takeUntil(this.destroyed$))
      .subscribe(([viewInit, navbar]) => {
        if (!isPlatformServer(platformId)) {
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
      });

    this.destroyed$
      .pipe(filter(d => !!d))
      .subscribe(() => {
        this.resizeObserver?.unobserve(this.navbar$.value?.nav.nativeElement);
      });
  }

  private destroyed$ = new Subject();
  private viewInit$ = new BehaviorSubject<boolean>(false);
  private navbar$ = new BehaviorSubject<BsNavbarComponent | null>(null);
  resizeObserver: ResizeObserver | null = null;
  initialPadding = 0;

  @Input('navbarContent') set navbar(value: BsNavbarComponent) {
    this.navbar$.next(value);
  }
  
  ngAfterViewInit() {
    this.viewInit$.next(true);
  }

  ngOnDestroy() {
    this.destroyed$.next(true);
  }
}
