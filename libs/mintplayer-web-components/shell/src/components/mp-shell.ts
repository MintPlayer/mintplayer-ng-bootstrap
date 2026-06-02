import { LitElement, html } from 'lit';
import { shellStyles } from '../styles';

export interface ShellStateChangeEventDetail {
  /** Whether the sidebar is now open (the toggle's checked state). */
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
 *       <nav slot="sidebar">…</nav>
 *       <main>…</main>
 *     </mp-shell>
 *
 * Attributes:
 *  - `state` — `auto` (default) | `show` | `hide`.
 *  - `breakpoint` — Bootstrap breakpoint name (`xs`…`xxl`, default `md`); below
 *    it the sidebar starts collapsed, at/above it expanded.
 *  - `size` — expanded sidebar width (any CSS length); also settable via the
 *    `--mp-shell-size` custom property.
 *  - `external-toggle` — hides the built-in hamburger; the consumer supplies a
 *    `<label for>` + a `slot="toggle"` checkbox and a global bridge rule.
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

  /** Whether the sidebar toggle is currently open. */
  get open(): boolean {
    return this.toggleInput?.checked ?? false;
  }

  /** Programmatically open/close the sidebar. Pass a boolean to force a state. */
  toggle(force?: boolean): void {
    const input = this.toggleInput;
    if (!input) return;
    input.checked = force ?? !input.checked;
    this.#emit(input.checked);
  }

  #onToggleChange = (event: Event): void => {
    this.#emit((event.target as HTMLInputElement).checked);
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
      <label for="mp-shell-toggle" class="shell-hamburger" part="hamburger">
        <slot name="hamburger">&#9776;</slot>
      </label>
      <div class="sidebar-root" part="sidebar-root">
        <aside class="sidebar" part="sidebar"><slot name="sidebar"></slot></aside>
        <div class="content" part="content"><slot></slot></div>
      </div>
      <slot name="toggle"></slot>
    `;
  }
}

if (!customElements.get('mp-shell')) {
  customElements.define('mp-shell', MpShell);
}
