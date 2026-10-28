import { NgTemplateOutlet } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, contentChild, DestroyRef, effect, ElementRef, inject, input, linkedSignal, output, signal, untracked } from '@angular/core';
import { BsIdService } from '@mintplayer/ng-bootstrap/a11y';
import { MpPropsDirective, useHostProps, useScopedStyles } from '@mintplayer/ng-bootstrap/machine';
import { DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles } from '@mintplayer/ui-core/dropdown-menu';
import {
  NAVBAR_SCOPE,
  attachNavbar,
  connectNavbar,
  connectNavbarBrand,
  navbarScopedStyles,
  setNavbarExpanded,
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
  // Compiled from @mintplayer/ui-core/navbar's navbar.view.vue (codegen).
  templateUrl: '../generated/navbar.view.generated.html',
  imports: [MpPropsDirective, NgTemplateOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The template's root is the host (mp-host): its bag lands here via useHostProps.
  host: { role: 'navigation' },
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

  private readonly brandSlot = contentChild(BsNavbarBrandDirective);
  private readonly togglerSlot = contentChild(BsNavbarTogglerDirective);
  /** The template's named slots. */
  protected readonly slots = computed(() => ({
    brand: this.brandSlot()?.templateRef,
    toggler: this.togglerSlot()?.templateRef,
  }));
  protected readonly brand = signal(connectNavbarBrand()).asReadonly();

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
    useHostProps(() => this.view().root);
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
    // The bag only seeds the checkbox; a changed input must also reach one the
    // user already flipped, whose `checked` attribute no longer applies.
    effect(() => {
      const expanded = this.expanded();
      if (untracked(this.hydrated)) setNavbarExpanded(this.elementRef.nativeElement, expanded);
    });
  }
}
