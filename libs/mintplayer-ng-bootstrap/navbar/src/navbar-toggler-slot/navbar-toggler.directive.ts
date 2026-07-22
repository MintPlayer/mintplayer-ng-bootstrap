import { Directive } from '@angular/core';

/**
 * `[bsNavbarToggler]` — marks an element as the navbar's custom hamburger
 * glyph, replacing the WC's built-in animated 3-bar → X toggler (the `toggler`
 * slot's fallback). The slot name stays an internal detail of the WC.
 *
 * The glyph is a first-class no-JS citizen: DSD slot assignment happens at
 * parse time (no fallback flash), the click reaches the in-shadow checkbox via
 * native label activation, and the open-state arrives as the inherited
 * `--mp-navbar-expanded: 0|1` custom property — derive the morph in CSS, e.g.
 * `transform: rotate(calc(var(--mp-navbar-expanded, 0) * 45deg))`.
 *
 * The host must be NON-interactive: labels do not forward clicks from
 * interactive descendants, so a `<button>`/`<a href>` here would kill the
 * no-JS toggle. Use a `<span>`/`<div>` glyph. (For a programmatic boolean, use
 * `[expanded]`/`(expandedchange)` on `bs-navbar` instead.)
 */
@Directive({
  selector: '[bsNavbarToggler]',
  host: {
    slot: 'toggler',
  },
})
export class BsNavbarTogglerDirective {}
