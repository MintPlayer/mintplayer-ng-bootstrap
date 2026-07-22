import { LitElement, html } from 'lit';
import { navbarStyles } from '../styles';
import type { NavbarExpandedChangeEventDetail } from '../types';

/**
 * `<mp-navbar>` — a responsive Bootstrap navbar whose chrome (the bar, the
 * hamburger toggle, the collapsible region) lives in its shadow root, with the
 * responsive collapse driven by a pure-CSS state machine (see
 * `navbar.styles.scss`). It therefore works with JavaScript disabled when the
 * shadow root is present (server-rendered as Declarative Shadow DOM).
 *
 * Authoring (vanilla): slot the brand into `slot="brand"`, the nav items as the
 * default slot (they are per-element WCs — `mp-navbar-item` etc. — that style
 * themselves; the navbar only owns the bar chrome). The hamburger is the
 * `toggler` slot's fallback — an animated 3-bar → X glyph driven by the same
 * no-JS `:checked` machine as the collapse. Slot a custom glyph via
 * `slot="toggler"`: it must be NON-interactive (no `<button>`/`<a href>`, or
 * native label→checkbox click forwarding dies) and can derive its open-state
 * from the inherited `--mp-navbar-expanded: 0|1` custom property.
 *
 *     <mp-navbar breakpoint="lg" color="body-tertiary">
 *       <a slot="brand" href="/">MyApp</a>
 *       <mp-navbar-item href="/home">Home</mp-navbar-item>
 *       …
 *     </mp-navbar>
 *
 * Attributes:
 *  - `breakpoint` — Bootstrap breakpoint name (`xs`…`xxl`, default `md`); at/above
 *    it the nav is inline and the hamburger hidden, below it the nav collapses.
 *  - `color` — background: a theme color (`primary`…`dark`) or an adaptive
 *    `body` / `body-secondary` / `body-tertiary`. Solid colors also set
 *    `data-bs-theme` on the host for text/link contrast.
 *  - `expanded` — programmatic collapse state (narrow mode); reflects the toggle.
 *  - `aria-label` — landmark label for the `<nav>` (default `Main navigation`).
 *  - `positioning` — `fixed` pins the bar to the top of the viewport, full width
 *    (like Bootstrap's `.fixed-top`); omit for the default in-flow bar. The
 *    consumer is responsible for offsetting page content below a fixed bar.
 *
 * Events: `expandedchange` (`detail: { expanded }`) when the collapse toggles.
 */
export class MpNavbar extends LitElement {
  static override styles = [navbarStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'breakpoint',
      'color',
      'expanded',
      'aria-label',
      'positioning',
    ];
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    // DSD handoff — identical to mp-shell / the dropdown WCs.
    const observed = (this.constructor as typeof LitElement & { observedAttributes: string[] }).observedAttributes;
    if (!observed.includes('defer-hydration')) {
      this.shadowRoot?.replaceChildren();
    }
    return super.createRenderRoot();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Mark JS as present so the no-JS `:focus-within` collapse reveal
    // disengages (mirrors mp-navbar-dropdown). Without the gate, clicking a
    // top-level nav link leaves focus on a still-visible anchor inside the
    // collapse, and `:focus-within` holds the menu open against the
    // dismiss-on-navigate `toggle(false)`.
    this.setAttribute('data-js', '');
    // Ensure the breakpoint is published even when the attribute is absent
    // (attributeChangedCallback only fires when it's present/changes).
    if (!this.style.getPropertyValue('--mp-navbar-breakpoint')) {
      this.#publishBreakpoint(this.getAttribute('breakpoint'));
    }
    this.addEventListener('click', this.#onNavLinkClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.#onNavLinkClick);
  }

  /**
   * Clicking a navigation link (an `<a href>` — a routerLink renders one) should
   * dismiss the menu: close every open dropdown and, in small mode, slide the
   * collapse shut. Dropdown *triggers* are `<a role="button">` with no `href`
   * (excluded), so opening a dropdown doesn't collapse the bar. Collapsing in
   * wide mode is a no-op (the collapse is always shown there).
   */
  #onNavLinkClick = (event: MouseEvent): void => {
    const link = event
      .composedPath()
      .find(
        (el): el is HTMLAnchorElement =>
          el instanceof HTMLAnchorElement &&
          el.hasAttribute('href') &&
          !el.classList.contains('dropdown-toggle'),
      );
    if (!link) return;
    this.querySelectorAll('mp-navbar-dropdown').forEach((d) =>
      (d as HTMLElement & { close?: () => void }).close?.(),
    );
    this.toggle(false);
  };

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'color') {
      this.#applyTheme(newValue);
    } else if (name === 'breakpoint') {
      this.#publishBreakpoint(newValue);
    } else if (name === 'expanded') {
      // Programmatic control: keep the CSS checkbox in sync with the attribute.
      const input = this.#toggleInput;
      if (input) input.checked = newValue !== null;
    } else if (name === 'aria-label') {
      this.requestUpdate();
    }
  }

  /** Solid colors need `data-bs-theme` for text/link contrast; adaptive names inherit the page theme. */
  #applyTheme(color: string | null): void {
    const theme = this.#themeFor(color);
    if (theme) this.setAttribute('data-bs-theme', theme);
    else if (this.getAttribute('data-bs-theme')) this.removeAttribute('data-bs-theme');
  }

  #themeFor(color: string | null): 'light' | 'dark' | null {
    if (!color) return null;
    if (color === 'light' || color === 'white') return 'light';
    if (color === 'body' || color === 'transparent' || color.startsWith('body-')) return null;
    return 'dark'; // primary, secondary, success, danger, warning, info, dark
  }

  /** min-width px for each Bootstrap breakpoint (xs = always collapsed → 0). */
  static readonly #BREAKPOINT_PX: Record<string, number> = {
    xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400,
  };

  /**
   * Publish the resolved breakpoint so DESCENDANT dropdowns (a different shadow
   * tree) can switch inline↔overlay. `data-breakpoint` is a convenience for JS;
   * `--mp-navbar-breakpoint` is the load-bearing channel — CSS custom properties
   * inherit THROUGH shadow boundaries, so `mp-navbar-dropdown` reads the px in JS
   * (matchMedia gate) without any DI/context.
   */
  #publishBreakpoint(name: string | null): void {
    const key = name ?? 'md';
    const px = MpNavbar.#BREAKPOINT_PX[key] ?? 768;
    this.setAttribute('data-breakpoint', key);
    this.style.setProperty('--mp-navbar-breakpoint', `${px}px`);
  }

  get #toggleInput(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.navbar-toggle') ?? null;
  }

  /** Whether the collapse is (visually) expanded — the toggle's checked state. */
  get expanded(): boolean {
    return this.#toggleInput?.checked ?? this.hasAttribute('expanded');
  }
  set expanded(v: boolean) {
    this.toggle(v);
  }

  /** Programmatically open/close the collapse. */
  toggle(force?: boolean): void {
    const input = this.#toggleInput;
    if (!input) return;
    input.checked = force ?? !input.checked;
    this.#emit(input.checked);
  }

  #onToggleChange = (): void => {
    const input = this.#toggleInput;
    const expanded = input?.checked ?? false;
    input?.setAttribute('aria-expanded', String(expanded));
    this.#emit(expanded);
  };

  #emit(expanded: boolean): void {
    this.dispatchEvent(
      new CustomEvent<NavbarExpandedChangeEventDetail>('expandedchange', {
        detail: { expanded },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const label = this.getAttribute('aria-label') ?? 'Main navigation';
    return html`
      <nav class="navbar" part="nav" aria-label=${label}>
        <slot name="brand"></slot>
        <input
          type="checkbox"
          id="mp-navbar-toggle"
          class="navbar-toggle"
          aria-label="Toggle navigation"
          aria-expanded="false"
          @change=${this.#onToggleChange}
        />
        <label for="mp-navbar-toggle" class="navbar-toggler" part="toggler" aria-hidden="true">
          <slot name="toggler">
            <span class="navbar-toggler-bar"></span>
            <span class="navbar-toggler-bar"></span>
            <span class="navbar-toggler-bar"></span>
          </slot>
        </label>
        <div class="navbar-collapse" part="collapse">
          <div class="navbar-collapse-inner">
            <ul class="navbar-nav nav-start" part="nav-start"><slot></slot></ul>
            <ul class="navbar-nav nav-end" part="nav-end"><slot name="end"></slot></ul>
          </div>
        </div>
      </nav>
    `;
  }
}

if (!customElements.get('mp-navbar')) {
  customElements.define('mp-navbar', MpNavbar);
}
