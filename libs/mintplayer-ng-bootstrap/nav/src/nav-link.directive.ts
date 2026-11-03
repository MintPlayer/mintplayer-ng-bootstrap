import { Directive, ElementRef, Renderer2, inject } from '@angular/core';
import { NAV_LINK_CLASS } from '@mintplayer/ui-core/nav';
import { BsNavItemComponent } from './generated';

/**
 * Makes a `bs-nav-item`'s link a `.nav-link` of the nav scope, so the nav part
 * (`.nav-link:where([data-mps])`) styles it: the consumer writes a plain
 * `<a routerLink>`. It runs in the constructor, so the server HTML carries both.
 *
 * Angular selectors cannot say `bs-nav-item > a` (a combinator parses as `a`),
 * so it matches every anchor and button of a template that imports it and
 * acts only inside a nav item.
 */
@Directive({ selector: 'a, button' })
export class BsNavLinkDirective {
  constructor() {
    if (!inject(BsNavItemComponent, { optional: true })) return;
    const link = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const renderer = inject(Renderer2);
    renderer.addClass(link, NAV_LINK_CLASS);
    renderer.setAttribute(link, 'data-mps', 'nav');
  }
}
