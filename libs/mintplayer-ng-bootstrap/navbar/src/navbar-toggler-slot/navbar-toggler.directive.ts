import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the template of the navbar's custom hamburger glyph, replacing the
 * built-in animated 3-bar → X toggler.
 *
 * ```html
 * <bs-navbar>
 *   <span *bsNavbarToggler class="my-glyph"></span>
 *   …
 * </bs-navbar>
 * ```
 *
 * It renders inside the toggler `<label>`, so the click reaches the collapse
 * checkbox through native label activation, with or without JavaScript. The
 * open state arrives as the inherited `--mp-navbar-expanded: 0|1` custom
 * property — derive the morph in CSS, e.g.
 * `transform: rotate(calc(var(--mp-navbar-expanded, 0) * 45deg))`.
 *
 * The glyph must be NON-interactive: labels do not forward clicks from
 * interactive descendants, so a `<button>`/`<a href>` here would kill the
 * toggle. Use a `<span>`/`<div>`. (For a programmatic boolean, use
 * `[expanded]`/`(expandedchange)` on `bs-navbar` instead.)
 */
@Directive({ selector: '[bsNavbarToggler]' })
export class BsNavbarTogglerDirective {
  readonly templateRef = inject(TemplateRef);
}
