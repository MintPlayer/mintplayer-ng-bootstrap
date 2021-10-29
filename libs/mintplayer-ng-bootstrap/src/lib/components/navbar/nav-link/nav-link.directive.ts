import { Directive, ElementRef } from '@angular/core';

@Directive({
  selector: 'bs-navbar-item > a[routerLink]'
})
export class NavLinkDirective {

  constructor(private elementRef: ElementRef<HTMLAnchorElement>) {
    console.log('add class');
    this.elementRef.nativeElement.classList.add('nav-link');
  }

}
