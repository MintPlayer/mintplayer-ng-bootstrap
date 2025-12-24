import { ChangeDetectorRef, Directive, ElementRef, inject, Renderer2 } from '@angular/core';
import { Router, RouterLinkActive } from '@angular/router';

// Here we extend the RouterLinkActiveDirective
// to have the "active" value for each <a> with a routerLink attribute

@Directive({
  selector: 'a[routerLink]',
  standalone: true
})
export class NavbarRouterLinkActiveDirective extends RouterLinkActive {

  constructor() {
    super(inject(Router), inject(ElementRef), inject(Renderer2), inject(ChangeDetectorRef));
    this.routerLinkActive = 'active';
  }

}
