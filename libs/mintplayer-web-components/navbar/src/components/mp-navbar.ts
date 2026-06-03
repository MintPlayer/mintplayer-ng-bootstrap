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
 * themselves; the navbar only owns the bar chrome).
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

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'color') {
      this.#applyTheme(newValue);
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
          <span class="navbar-toggler-icon"></span>
        </label>
        <div class="navbar-collapse" part="collapse"><slot></slot></div>
      </nav>
    `;
  }
}

if (!customElements.get('mp-navbar')) {
  customElements.define('mp-navbar', MpNavbar);
}
