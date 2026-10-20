import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkActive } from '@angular/router';
import { BS_DROPDOWN_MENU_CONTEXT } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { MpPropsDirective } from '@mintplayer/ng-bootstrap/machine';
import { connectNavbarContents, connectNavbarDropdown } from '@mintplayer/ui-core/navbar';
import { BsNavbarDropdownLabelDirective } from './navbar-dropdown-label.directive';

const contents = connectNavbarContents();

/**
 * `<bs-navbar-dropdown>` — a navbar dropdown, or a submenu when nested.
 *
 *     <bs-navbar-dropdown>
 *       <span *bsNavbarDropdownLabel>Basic</span>
 *       <bs-navbar-item><a routerLink="/basic/alert">Alert</a></bs-navbar-item>
 *       <bs-navbar-dropdown>…</bs-navbar-dropdown>   <!-- submenu -->
 *     </bs-navbar-dropdown>
 *
 * Renders a native `<details>`: the `*bsNavbarDropdownLabel` template is the
 * `<summary>`, the items are its `.dropdown-menu` panel. It opens and closes
 * with JavaScript off; the navbar's attachment adds the arrow keys, Escape and
 * outside-click closing. Dropdowns at one depth share a `name`, so opening one
 * closes its siblings. This is disclosure navigation, not an ARIA menu: every
 * link stays a link in the tab order.
 *
 * The host is taken out of the layout, so the `<details>` is the flex item.
 * `BS_DROPDOWN_MENU_CONTEXT` is provided here, so nested `<bs-navbar-item>`s
 * render their `.dropdown-item` shape.
 *
 * A `RouterLinkActive` host directive collects the projected descendant
 * `routerLink`s; while any is active the trigger is highlighted, so the whole
 * trigger chain of the active route lights up, server-side too.
 */
@Component({
  selector: 'bs-navbar-dropdown',
  templateUrl: './navbar-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet, MpPropsDirective],
  providers: [{ provide: BS_DROPDOWN_MENU_CONTEXT, useValue: true }],
  hostDirectives: [RouterLinkActive],
  host: {
    '[class]': 'contentsClass',
    '[attr.data-mps]': 'contentsScope',
  },
})
export class BsNavbarDropdownComponent {
  protected readonly label = contentChild.required(BsNavbarDropdownLabelDirective);

  /** 0 in a nav group, one more per enclosing dropdown. */
  readonly depth: number = (inject(BsNavbarDropdownComponent, { optional: true, skipSelf: true })?.depth ?? -1) + 1;

  /** A projected descendant link's route is active. */
  private readonly routeActive = signal(false);

  protected readonly contentsClass = contents['class'];
  protected readonly contentsScope = contents['data-mps'];
  protected readonly view = computed(() => connectNavbarDropdown({ depth: this.depth, active: this.routeActive() }));

  constructor() {
    const rla = inject(RouterLinkActive, { self: true });
    // No class on this host: the state goes on the summary through the bag.
    rla.routerLinkActive = [];
    rla.isActiveChange.pipe(takeUntilDestroyed()).subscribe((active) => this.routeActive.set(active));
  }
}
