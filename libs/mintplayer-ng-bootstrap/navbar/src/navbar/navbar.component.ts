import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, ElementRef, inject, input, linkedSignal, output, signal } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles } from '@mintplayer/ui-core/dropdown-menu';
import {
  NAVBAR_SCOPE,
  attachNavbar,
  connectNavbar,
  connectNavbarBrand,
  navbarScopedStyles,
  type NavbarBreakpoint,
  type NavbarExpandedChangeEventDetail,
  type NavbarLabels,
} from '@mintplayer/ui-core/navbar';
import { BsNavbarBrandDirective } from '../navbar-brand/navbar-brand.directive';
import { BsNavbarTogglerDirective } from '../navbar-toggler-slot/navbar-toggler.directive';

/**
 * `<bs-navbar>` — Bootstrap navbar with a no-JS collapse and native
 * `<details>` dropdowns (#437).
 *
 *     <bs-navbar [color]="'primary'" [breakpoint]="'lg'">
 *       <a *bsNavbarBrand routerLink="/">Brand</a>
 *       <bs-navbar-nav>
 *         <bs-navbar-item><a routerLink="/home">Home</a></bs-navbar-item>
 *         <bs-navbar-dropdown>…</bs-navbar-dropdown>
 *       </bs-navbar-nav>
 *       <bs-navbar-nav align="end">…</bs-navbar-nav>
 *     </bs-navbar>
 *
 * Renders the markup of `@mintplayer/ui-core/navbar` in its own template, so
 * the server-rendered page is the working navbar: the collapse is a checkbox
 * and every dropdown a `<details>`, both of which work with JavaScript off.
 * The host is the `.navbar` root and the navigation landmark (a host cannot be
 * a `<nav>`, so it carries the role). An `aria-label` on the host names it.
 *
 * The brand is the `*bsNavbarBrand` template. A custom hamburger glyph is the
 * `*bsNavbarToggler` template; it replaces the three bars and reads the open
 * state from `--mp-navbar-expanded: 0|1`.
 */
@Component({
  selector: 'bs-navbar',
  templateUrl: './navbar.component.html',
  imports: [MpPropsDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'navigation',
    '[class]': 'view().root["class"]',
    '[attr.data-mps]': 'view().root["data-mps"]',
    '[attr.data-breakpoint]': 'view().root["data-breakpoint"]',
    '[attr.data-bs-theme]': 'view().root["data-bs-theme"]',
    '[attr.aria-label]': 'view().root["aria-label"]',
    '[attr.data-mp-hydrated]': 'view().root["data-mp-hydrated"] ? "" : null',
  },
})
export class BsNavbarComponent {
  /** Host element — measured by `[bsNavbarContent]` to offset page content. */
  readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Bootstrap breakpoint the navbar expands at; collapses below it. */
  readonly breakpoint = input<NavbarBreakpoint>('md');
  /** Theme color of the navbar background (e.g. `primary`, `dark`, `body-tertiary`). */
  readonly color = input<string>();
  /** Whether the collapse is expanded (narrow mode). */
  readonly expanded = input(false);
  /** `fixed` pins the bar to the top of the viewport, full width; omit for in-flow. */
  readonly positioning = input<'fixed'>();
  /** Localized accessible names; an `aria-label` on the host names the landmark too. */
  readonly labels = input<Partial<NavbarLabels> | null>(null);

  /** Fires when the collapse opens or closes through the bar. */
  readonly expandedchange = output<NavbarExpandedChangeEventDetail>();

  protected readonly brand = contentChild(BsNavbarBrandDirective);
  protected readonly toggler = contentChild(BsNavbarTogglerDirective);
  protected readonly brandBag = connectNavbarBrand();

  private readonly id = inject(BsIdService).next('bs-navbar');
  private readonly hostLabel = this.elementRef.nativeElement.getAttribute('aria-label');
  private readonly hydrated = signal(false);
  /** The live collapse state: the input, until the user toggles the checkbox. */
  protected readonly isExpanded = linkedSignal(() => this.expanded());

  protected readonly view = computed(() =>
    connectNavbar({
      id: this.id,
      breakpoint: this.breakpoint(),
      color: this.color(),
      positioning: this.positioning(),
      expanded: this.isExpanded(),
      hydrated: this.hydrated(),
      labels: { ...(this.hostLabel ? { nav: this.hostLabel } : {}), ...(this.labels() ?? {}) },
    }),
  );

  constructor() {
    useScopedStyles(NAVBAR_SCOPE, navbarScopedStyles);
    useScopedStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.hydrated.set(true);
      const dispose = attachNavbar(this.elementRef.nativeElement, {
        onExpandedChange: (expanded) => {
          this.isExpanded.set(expanded);
          this.expandedchange.emit({ expanded });
        },
      });
      destroyRef.onDestroy(dispose);
    });
  }
}
