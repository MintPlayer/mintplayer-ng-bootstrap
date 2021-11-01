import { AfterViewInit, Directive, ElementRef, Input, OnDestroy } from '@angular/core';
import { BsNavbarComponent } from '../navbar/navbar.component';

@Directive({
  selector: '[navbarContent]'
})
export class NavbarContentDirective implements AfterViewInit, OnDestroy {

  constructor(private element: ElementRef) {
    this.resizeObserver = new ResizeObserver((entries) => {
      let height = entries[0].contentRect.height;
      this.element.nativeElement.style.paddingTop = (this.initialPadding + height) + 'px';
    });
  }

  @Input('navbarContent') navbar!: BsNavbarComponent;

  ngAfterViewInit() {
    let p = parseInt(this.element.nativeElement.style.paddingTop.replace(/px$/, ''));
    this.initialPadding = isNaN(p) ? 0 : p;
    this.resizeObserver.observe(this.navbar.nav.nativeElement);
  }

  ngOnDestroy() {
    this.resizeObserver.unobserve(this.navbar.nav.nativeElement);
  }

  resizeObserver: ResizeObserver;
  initialPadding: number = 0;
}
