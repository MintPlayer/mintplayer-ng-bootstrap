import { Directive, ElementRef, Renderer2, inject } from '@angular/core';
import { BsNavbarItemComponent } from './generated';

/**
 * Makes a `bs-navbar-item`'s link a `.nav-link` of the navbar scope, so
 * Bootstrap's nav and navbar parts style it: the consumer writes a plain
 * `<a routerLink>`. (Inside a dropdown the entries are `bs-dropdown-item`s,
 * whose links stay plain.) It runs in the constructor, so the server HTML carries both.
 *
 * Angular selectors cannot say `bs-navbar-item > a` (a combinator parses as
 * `a`), so it matches every anchor and button of a template that imports it
 * and acts only inside a navbar item.
 */
@Directive({ selector: 'a, button' })
export class BsNavbarLinkDirective {
  constructor() {
    if (!inject(BsNavbarItemComponent, { optional: true })) return;
    const link = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    renderer.addClass(link, 'nav-link');
    renderer.setAttribute(link, 'data-mps', 'navbar');
  }
}
