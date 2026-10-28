import { LitElement } from 'lit';
import { installLightStyles } from '@mintplayer/web-components/light-dom';
import { applyHostProps, EMPTY_HOST_PROPS, LightChildren } from '@mintplayer/web-components/machine';
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
} from '@mintplayer/ui-core/navbar';
import { navbarTemplate } from '../generated/navbar.view.generated';

const BREAKPOINTS = new Set<string>(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
const BRAND = connectNavbarBrand();
let instanceCounter = 0;


/**
 * `<mp-navbar>` — the Lit front of the navbar (#437), rendered in the light
 * DOM from the template compiled out of `@mintplayer/ui-core/navbar`. The
 * element itself is the `.navbar` root and the navigation landmark; the
 * collapse is a checkbox and every dropdown a native `<details>`.
 *
 *     <mp-navbar breakpoint="lg" color="body-tertiary" label="Main">
 *       <a slot="brand" href="/">MyApp</a>
 *       <mp-navbar-nav>
 *         <mp-navbar-item active><a href="/home">Home</a></mp-navbar-item>
 *         <mp-navbar-dropdown label="Products">
 *           <mp-navbar-item><a href="/widgets">Widgets</a></mp-navbar-item>
 *         </mp-navbar-dropdown>
 *       </mp-navbar-nav>
 *       <mp-navbar-nav align="end">…</mp-navbar-nav>
 *     </mp-navbar>
 *
 * The element moves its authored children into the rendered bar once:
 * `slot="brand"` into the brand, `slot="toggler"` (a non-interactive glyph that
 * reads `--mp-navbar-expanded: 0|1`) into the hamburger, the rest into the
 * collapse. Children appended later land in the collapse.
 *
 * Tier: JS-only — server-rendered pages use a framework front, which emits the
 * same markup as plain HTML.
 *
 * Attributes: `breakpoint` (`xs`…`xxl`, default `md`), `color` (a theme
 * colour or `body` / `body-secondary` / `body-tertiary`), `expanded`,
 * `positioning` (`fixed`), `label` (the landmark name; an `aria-label` works too).
 *
 * Events: `expandedchange` (`detail: { expanded }`).
 */
export class MpNavbar extends LitElement {
  static override properties = {
    breakpoint: { type: String, reflect: true },
    color: { type: String, reflect: true },
    expanded: { type: Boolean, reflect: true },
    positioning: { type: String, reflect: true },
    label: { type: String },
  };

  declare breakpoint: NavbarBreakpoint;
  declare color: string | null;
  declare expanded: boolean;
  declare positioning: 'fixed' | null;
  declare label: string | null;

  readonly #id = `mp-navbar-${++instanceCounter}`;
  readonly #children = new LightChildren(this);
  #host = EMPTY_HOST_PROPS;
  #hydrated = false;
  #dispose: (() => void) | null = null;

  constructor() {
    super();
    this.breakpoint = 'md';
    this.color = null;
    this.expanded = false;
    this.positioning = null;
    this.label = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.label ??= this.getAttribute('aria-label');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dispose?.();
    this.#dispose = null;
  }

  /** Open or close the collapse (narrow mode). */
  toggle(force?: boolean): void {
    const next = force ?? !this.expanded;
    if (setNavbarExpanded(this, next) === null) return;
    this.#report(next);
  }

  #report(expanded: boolean): void {
    this.expanded = expanded;
    this.dispatchEvent(
      new CustomEvent<NavbarExpandedChangeEventDetail>('expandedchange', { detail: { expanded }, bubbles: true, composed: true }),
    );
  }

  protected override willUpdate(): void {
    this.#children.capture();
  }

  protected override firstUpdated(): void {
    this.#hydrated = true;
    this.#dispose = attachNavbar(this, { onExpandedChange: (expanded) => this.#report(expanded) });
    this.requestUpdate();
  }

  protected override updated(changed: Map<string, unknown>): void {
    // The bag only seeds the checkbox; a later change must also reach one the user flipped.
    if (changed.has('expanded') && changed.get('expanded') !== undefined) setNavbarExpanded(this, this.expanded);
  }

  override render() {
    const view = connectNavbar({
      id: this.#id,
      breakpoint: BREAKPOINTS.has(this.breakpoint) ? this.breakpoint : 'md',
      color: this.color,
      positioning: this.positioning,
      expanded: this.expanded,
      hydrated: this.#hydrated,
      labels: this.label ? { nav: this.label } : null,
    });
    this.#host = applyHostProps(this, this.#host, { ...view.root, role: 'navigation' });
    const { brand, toggler, default: content } = this.#children.slots;
    return navbarTemplate({ view, brand: BRAND, slots: { brand, toggler, default: content } });
  }
}

if (typeof document !== 'undefined' && document.head) {
  installLightStyles(NAVBAR_SCOPE, navbarScopedStyles);
  installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);
}

if (!customElements.get('mp-navbar')) {
  customElements.define('mp-navbar', MpNavbar);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-navbar': MpNavbar;
  }
}
