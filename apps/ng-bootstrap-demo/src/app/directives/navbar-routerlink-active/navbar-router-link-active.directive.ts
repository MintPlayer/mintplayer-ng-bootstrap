import { ChangeDetectorRef, Directive, ElementRef, Renderer2 } from '@angular/core';
import { Router, RouterLinkActive, RouterLink } from '@angular/router';

// Here we extend the RouterLinkActiveDirective
// to have the "active" value for each <a> with a routerLink attribute

@Directive({
  selector: 'a[routerLink]',
  standalone: true
})
export class NavbarRouterLinkActiveDirective extends RouterLinkActive {

  constructor(router: Router, element: ElementRef<any>, renderer: Renderer2, cdr: ChangeDetectorRef, routerLinkWithHref: RouterLink) {
    super(router, element, renderer, cdr, routerLinkWithHref);
    this.routerLinkActive = 'active';
  }

}
