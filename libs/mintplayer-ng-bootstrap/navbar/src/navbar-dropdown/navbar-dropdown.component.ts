import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, contentChild, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLinkActive } from '@angular/router';
import { BS_DROPDOWN_MENU_CONTEXT } from '@mintplayer/ng-bootstrap/dropdown-menu';
import { MpPropsDirective } from '@mintplayer/ng-bootstrap/machine';
import { connectNavbarContents, connectNavbarDropdown } from '@mintplayer/ui-core/navbar';
import { BsNavbarDropdownLabelDirective } from './navbar-dropdown-label.directive';

const contents = connectNavbarContents();

/** 0 without an enclosing dropdown, one more than its depth otherwise. */
const nestedDepth = (parent: { readonly depth: number } | null): number => (parent?.depth ?? -1) + 1;

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
  // Compiled from @mintplayer/ui-core/navbar's navbar-dropdown.view.vue (codegen).
  templateUrl: '../generated/navbar-dropdown.view.generated.html',
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
  /** The trigger text; use a `*bsNavbarDropdownLabel` template for an icon or markup. */
  readonly label = input<string>();
  private readonly labelSlot = contentChild(BsNavbarDropdownLabelDirective);
  /** The template's named slots. */
  protected readonly slots = computed(() => ({ label: this.labelSlot()?.templateRef }));

  /** 0 in a nav group, one more per enclosing dropdown. */
  readonly depth: number = nestedDepth(inject(BsNavbarDropdownComponent, { optional: true, skipSelf: true }));

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
