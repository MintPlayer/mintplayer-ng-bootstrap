import { LitElement, html } from 'lit';
import { shellStyles } from '../styles';

export interface ShellStateChangeEventDetail {
  /** Whether the sidebar is now (visually) open after the toggle. */
  open: boolean;
}

/**
 * `<mp-shell>` — responsive sidebar layout shell.
 *
 * The shadow DOM is *static chrome* (a hidden checkbox toggle, the hamburger
 * label, the sidebar-root with named slots); the consumer's sidebar and main
 * content are slotted light DOM. All visibility is pure CSS (see
 * `shell.styles.scss`), so it works with JavaScript disabled when the shadow
 * root is present (e.g. server-rendered as Declarative Shadow DOM).
 *
 * Authoring (vanilla):
 *
 *     <mp-shell breakpoint="md">
 *       <div slot="topbar">…brand / nav…</div>
 *       <nav slot="sidebar">…</nav>
 *       <main>…</main>
 *     </mp-shell>
 *
 * Layout: a full-width top bar (the built-in hamburger toggle on its left, plus
 * the `topbar` slot) sits above a row of `sidebar` + default (content) slots.
 * The sidebar slides in/out below the top bar, which stays put.
 *
 * Attributes:
 *  - `state` — `auto` (default) | `show` | `hide`.
 *  - `breakpoint` — Bootstrap breakpoint name (`xs`…`xxl`, default `md`); below
 *    it the sidebar starts collapsed, at/above it expanded.
 *  - `size` — expanded sidebar width (any CSS length); also settable via the
 *    `--mp-shell-size` custom property.
 *  - `external-toggle` — hides the built-in hamburger; the consumer supplies a
 *    `<label for>` + a `slot="toggle"` checkbox and a global bridge rule.
 *  - `dismiss-on-navigate` — opt-in: when a navigation link (`<a href>`) inside
 *    the `sidebar` slot is clicked while in narrow/overlay mode, auto-close the
 *    drawer (the mobile-drawer convention). No effect in wide mode; a pure
 *    progressive enhancement (with JS off the link just navigates). Mark a link
 *    (or any wrapper around it) with `data-no-dismiss` to exclude it — e.g. a
 *    parent nav item that only expands a sub-list or highlights the active path
 *    and cancels its own navigation.
 *
 * Events: `statechange` (`detail: { open }`) when the toggle flips.
 */
export class MpShell extends LitElement {
  static override styles = [shellStyles];

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'state',
      'breakpoint',
      'size',
      'external-toggle',
    ];
  }

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    // When this element is server-rendered as Declarative Shadow DOM, the parser
    // attaches a shadow root pre-filled with an *inert* copy of our chrome (no
    // lit-html "part" link). There are two ways the client can take over it:
    //
    //  - True hydration, when @lit-labs/ssr-client's hydrate-support has patched
    //    *this* element's LitElement. The app and this WC must then share a single
    //    `lit` instance (the case in the React/Vue demos). Detect it via the
    //    `defer-hydration` attribute the shim adds to `observedAttributes`, and
    //    defer entirely to the patched `super` (which reuses the DSD via hydrate()).
    //
    //  - Plain re-render, when the shim hasn't reached us — e.g. a host that
    //    bundles `lit` as a *different* instance than this WC (Vite dep
    //    pre-bundling a workspace lib's lit separately, as in the Angular demo).
    //    Then lit-element's createRenderRoot pins `renderOptions.renderBefore` to
    //    the first SSR node and the first render() inserts a SECOND copy ahead of
    //    it (a duplicate top bar/hamburger). Clear the inert SSR chrome BEFORE
    //    `super` captures it so render() repopulates the shadow exactly once.
    //    `super` re-adopts our styles via adoptedStyleSheets (not children), and
    //    the result is visually identical because the chrome is static — the DSD
    //    still does its only job, the no-JS render before this element upgrades.
    const hydrateSupportActive =
      (this.constructor as typeof MpShell).observedAttributes.includes('defer-hydration');
    if (!hydrateSupportActive) {
      this.shadowRoot?.replaceChildren();
    }
    return super.createRenderRoot();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Progressive enhancement for the `dismiss-on-navigate` opt-in: a click on a
    // sidebar link closes the overlay drawer (narrow mode only). The listener is
    // on the host, so it catches clicks bubbling out of the slotted sidebar.
    this.addEventListener('click', this.#onSidebarClick);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.#onSidebarClick);
  }

  /**
   * Auto-close the drawer when a navigation link inside the `sidebar` slot is
   * clicked — only when `dismiss-on-navigate` is set AND the shell is in
   * narrow/overlay mode. Reads the attribute on demand (no reactive property).
   * The anchor must sit *before* the sidebar slot in the composed path, i.e.
   * inside the slotted sidebar content — so topbar/content clicks are ignored.
   * Opt-out: a clicked link (or any wrapper around it) carrying `data-no-dismiss`
   * is ignored — for parent items that only expand a sub-list / highlight the
   * active path and cancel their own navigation. Opt-out (rather than opt-in)
   * keeps the common case — every leaf link dismisses — annotation-free.
   */
  #onSidebarClick = (event: MouseEvent): void => {
    if (!this.hasAttribute('dismiss-on-navigate')) return;
    if (this.#isWide()) return;
    const path = event.composedPath();
    const sidebarSlot = this.renderRoot?.querySelector('slot[name="sidebar"]');
    const slotIndex = sidebarSlot ? path.indexOf(sidebarSlot) : -1;
    if (slotIndex < 0) return;
    // The slotted sidebar subtree the click passed through (target → … → slot).
    const within = path.slice(0, slotIndex);
    if (within.some((el) => el instanceof HTMLElement && el.hasAttribute('data-no-dismiss'))) return;
    const clickedSidebarLink = within.some(
      (el) => el instanceof HTMLElement && el.tagName === 'A' && el.hasAttribute('href'),
    );
    if (clickedSidebarLink && this.open) this.toggle(false);
  };

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    // `state`, `breakpoint` and `external-toggle` drive the layout purely via
    // `:host([...])` selectors — no JS needed. Only `size` maps to a custom
    // property on the host.
    if (name === 'size') {
      if (newValue) this.style.setProperty('--mp-shell-size', newValue);
      else this.style.removeProperty('--mp-shell-size');
    }
  }

  private get toggleInput(): HTMLInputElement | null {
    return this.renderRoot?.querySelector<HTMLInputElement>('.shell-toggle') ?? null;
  }

  /**
   * The *resolved, visual* open state — read straight from the value the CSS
   * computed (`--mp-shell-open`), so it accounts for `state`, `breakpoint`, the
   * viewport and the toggle checkbox all at once. The CSS is the single source
   * of truth; we don't re-derive the matrix in JS.
   */
  #cssOpen(): boolean {
    if (typeof window === 'undefined') return false;
    // Read it off `.sidebar-root`: in `auto` the matrix sets the lever there
    // (per breakpoint); with an explicit `state` the host sets it and it
    // inherits down. Either way `.sidebar-root` carries the resolved value.
    const root = this.renderRoot?.querySelector<HTMLElement>('.sidebar-root');
    if (!root) return false;
    return getComputedStyle(root).getPropertyValue('--mp-shell-open').trim() === '1';
  }

  /** An explicit `state` (`show`/`hide`) freezes the CSS checkbox. */
  #hasExplicitState(): boolean {
    const state = this.getAttribute('state');
    return state === 'show' || state === 'hide';
  }

  /**
   * Wide (sidebar pushes content) vs narrow (sidebar overlays) — read from the
   * `--mp-shell-wide` lever the media queries resolved (1 = wide, 0 = narrow),
   * avoiding any breakpoint duplication in JS. (The sidebar is now
   * `position: absolute` in BOTH modes, so position no longer discriminates.)
   */
  #isWide(): boolean {
    if (typeof window === 'undefined') return true;
    const root = this.renderRoot?.querySelector<HTMLElement>('.sidebar-root');
    if (!root) return true;
    return getComputedStyle(root).getPropertyValue('--mp-shell-wide').trim() === '1';
  }

  /**
   * Keep the checkbox encoding the resolved open for the current viewport, so
   * that returning to `auto` (where the checkbox drives the CSS again) resolves
   * to the same visual state instead of jumping. In `auto` the checkbox means
   * "inverted from the responsive default": wide default = open (checked ⇒
   * closed); narrow default = closed (checked ⇒ open).
   */
  #syncCheckbox(open: boolean): void {
    const input = this.toggleInput;
    if (!input) return;
    input.checked = this.#isWide() ? !open : open;
  }

  /** Whether the sidebar is currently (visually) open. */
  get open(): boolean {
    return this.#cssOpen();
  }

  /** Programmatically open/close the sidebar. Pass a boolean to force a state. */
  toggle(force?: boolean): void {
    const next = force ?? !this.open;
    this.#syncCheckbox(next);
    this.#emit(next);
  }

  #onToggleChange = (): void => {
    // The checkbox has just flipped. In `auto` it already drove the CSS to the
    // new visual state, so the resolved value IS the new state. With an explicit
    // `state` the CSS ignores the checkbox, so the click means "flip the frozen
    // value". Either way `next` is the new visual open; the consumer drives
    // `state` from our event (controlled), we never mutate `state` ourselves.
    const cssOpen = this.#cssOpen();
    const next = this.#hasExplicitState() ? !cssOpen : cssOpen;
    this.#syncCheckbox(next);
    this.#emit(next);
  };

  #emit(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<ShellStateChangeEventDetail>('statechange', {
        detail: { open },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    return html`
      <input
        type="checkbox"
        id="mp-shell-toggle"
        class="shell-toggle"
        aria-label="Toggle sidebar"
        @change=${this.#onToggleChange}
      />
      <div class="topbar" part="topbar">
        <label for="mp-shell-toggle" class="shell-hamburger" part="hamburger" title="Toggle sidebar">
          <slot name="hamburger">&#9776;</slot>
        </label>
        <slot name="topbar"></slot>
      </div>
      <div class="sidebar-root" part="sidebar-root">
        <aside class="sidebar" part="sidebar" aria-label="Sidebar"><slot name="sidebar"></slot></aside>
        <div class="content" part="content"><slot></slot></div>
      </div>
      <slot name="toggle"></slot>
    `;
  }
}

if (!customElements.get('mp-shell')) {
  customElements.define('mp-shell', MpShell);
}
