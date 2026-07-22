import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, contentChild, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkActive } from '@angular/router';
import { BS_DROPDOWN_MENU_CONTEXT, BsDropdownMenuComponent } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { BsNavbarDropdownLabelDirective } from './navbar-dropdown-label.directive';

/**
 * `<bs-navbar-dropdown>` — Angular wrapper around `<mp-navbar-dropdown>`.
 *
 * The trigger content is the `*bsNavbarDropdownLabel` template — any HTML
 * (matches the React/Vue wrappers, which take the WC's `label` slot directly).
 * The dropdown panel (`<bs-dropdown-menu>`) is rendered internally — author
 * the items directly between the tags, uniformly with the rest of the navbar:
 *
 *     <bs-navbar-dropdown>
 *       <span *bsNavbarDropdownLabel>Basic</span>
 *       <bs-navbar-item><a routerLink="/basic/alert">Alert</a></bs-navbar-item>
 *       <bs-navbar-dropdown>…</bs-navbar-dropdown>   <!-- submenu -->
 *     </bs-navbar-dropdown>
 *
 * `BS_DROPDOWN_MENU_CONTEXT` is provided here (element injectors follow the
 * consumer template's nesting, not the projection site — the internally
 * rendered menu is invisible to projected children's injectors), so nested
 * `<bs-navbar-item>`s render their `.dropdown-item` shape.
 *
 * **Active-route trigger highlighting:** a `RouterLinkActive` host directive
 * collects the projected descendant `routerLink`s; when any is active
 * (non-exact — the whole subtree counts, like the legacy `[bsNavbarTrigger]`
 * prefix match) the WC gets its `active` attribute, which recolors the
 * shadow-rendered trigger (primary background for submenu triggers). Nested
 * dropdowns each report their own subtree, so the full trigger chain of the
 * active route highlights. Renders server-side, so it works with JS off.
 *
 * Reveal/positioning and the no-JS `:focus-within` fallback all live in the WC.
 */
@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [NgTemplateOutlet, BsDropdownMenuComponent],
  providers: [{ provide: BS_DROPDOWN_MENU_CONTEXT, useValue: true }],
  hostDirectives: [RouterLinkActive],
})
export class BsNavbarDropdownComponent {
  protected readonly label = contentChild.required(BsNavbarDropdownLabelDirective);

  /** A projected descendant link's route is active → highlight the trigger. */
  protected readonly routeActive = signal(false);

  constructor() {
    const rla = inject(RouterLinkActive, { self: true });
    // No class on this host — the state is bridged to the WC's `active`
    // attribute instead (the trigger lives in the WC's shadow, out of reach
    // of any class-based styling from here).
    rla.routerLinkActive = [];
    rla.isActiveChange.pipe(takeUntilDestroyed()).subscribe((active) => this.routeActive.set(active));
  }
}
