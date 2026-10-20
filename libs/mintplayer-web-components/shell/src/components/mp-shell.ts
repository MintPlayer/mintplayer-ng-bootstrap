import { LitElement, css, html } from 'lit';
import { adoptLightStyles, installLightStyles } from '@mintplayer/web-components/light-dom';
import { props } from '@mintplayer/web-components/machine';
import {
  SHELL_SCOPE,
  applyShellState,
  connectShell,
  focusShellContent,
  shellScopedStyles,
  shouldDismissShell,
  toggleShell,
  type ShellBreakpoint,
  type ShellState,
} from '@mintplayer/ui-core/shell';

export interface ShellStateChangeEventDetail {
  /** Whether the sidebar is now open. */
  open: boolean;
}

const BREAKPOINTS = new Set<string>(['xs', 'sm', 'md', 'lg', 'xl', 'xxl']);
let instanceCounter = 0;

/**
 * `<mp-shell>` — the Lit front of the responsive app shell (#437), rendering
 * the markup of `@mintplayer/ui-core/shell` in its shadow root. The open state
 * is a native checkbox per viewport mode and every rule is the shared scoped
 * sheet, which is mirrored into the shadow root.
 *
 *     <mp-shell breakpoint="md">
 *       <div slot="topbar">…brand / nav…</div>
 *       <nav slot="sidebar">…</nav>
 *       <main>…</main>
 *     </mp-shell>
 *
 * Content arrives through real slots only, so the shadow root stays. Tier:
 * JS-only — server-rendered pages use a framework front, which emits the
 * working shell as plain HTML.
 *
 * Attributes: `state` (`auto` | `show` | `hide`), `breakpoint` (`xs`…`xxl`,
 * default `md`), `size` (expanded width, any CSS length), `external-toggle`
 * (hide the hamburger), `dismiss-on-navigate` (close the overlay drawer when a
 * sidebar link is clicked; `data-no-dismiss` exempts a link).
 *
 * Events: `statechange` (`detail: { open }`).
 */
export class MpShell extends LitElement {
  static override styles = css`
    :host { display: flex; flex-direction: column; }
    .shell { flex: 1 1 auto; min-block-size: 0; }
  `;

  static override properties = {
    state: { type: String, reflect: true },
    breakpoint: { type: String, reflect: true },
    size: { type: String, reflect: true },
    externalToggle: { type: Boolean, reflect: true, attribute: 'external-toggle' },
    dismissOnNavigate: { type: Boolean, reflect: true, attribute: 'dismiss-on-navigate' },
  };

  declare state: ShellState;
  declare breakpoint: ShellBreakpoint;
  declare size: string | null;
  declare externalToggle: boolean;
  declare dismissOnNavigate: boolean;

  readonly #id = `mp-shell-${++instanceCounter}`;
  #releaseStyles: (() => void) | null = null;
  #appliedState: ShellState | null = null;

  constructor() {
    super();
    this.state = 'auto';
    this.breakpoint = 'md';
    this.size = null;
    this.externalToggle = false;
    this.dismissOnNavigate = false;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseStyles = adoptLightStyles(this.renderRoot as ShadowRoot);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseStyles?.();
    this.#releaseStyles = null;
  }

  get #root(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('.shell');
  }

  /** Open or close the sidebar in the current viewport mode. */
  toggle(force?: boolean): void {
    const root = this.#root;
    const open = root ? toggleShell(root, force) : null;
    if (open !== null) this.#emit(open);
  }

  #emit(open: boolean): void {
    this.dispatchEvent(new CustomEvent<ShellStateChangeEventDetail>('statechange', { detail: { open }, bubbles: true, composed: true }));
  }

  #onToggleChange = (event: Event): void => {
    this.#emit((event.target as HTMLInputElement).checked);
  };

  #onSkip = (event: Event): void => {
    const root = this.#root;
    if (root) focusShellContent(event, root);
  };

  #onClick = (event: MouseEvent): void => {
    const root = this.#root;
    if (this.dismissOnNavigate && root && shouldDismissShell(event, root)) this.toggle(false);
  };

  protected override updated(): void {
    // The bags set the initial state; a later change must also reach a checkbox
    // the user already flipped, whose attribute no longer applies.
    const root = this.#root;
    if (root && this.#appliedState !== null && this.#appliedState !== this.state) applyShellState(root, this.state);
    this.#appliedState = this.state;
  }

  override render() {
    const view = connectShell({
      id: this.#id,
      state: this.state,
      breakpoint: BREAKPOINTS.has(this.breakpoint) ? this.breakpoint : 'md',
      externalToggle: this.externalToggle,
    });
    return html`
      <div ${props(view.root)} style=${this.size ? `--mp-shell-size: ${this.size}` : ''} @click=${this.#onClick}>
        <a ${props(view.skip)} href=${view.skipHref} @click=${this.#onSkip}>${view.skipText}</a>
        ${view.toggles.map((t) => html`<input ${props(t.input)} @change=${this.#onToggleChange} />`)}
        <div ${props(view.topbar)}>
          ${view.toggles.map((t) => html`<label ${props(t.label)}>${view.hamburgerText}</label>`)}
          <slot name="topbar"></slot>
        </div>
        <div ${props(view.sidebarRoot)}>
          <aside ${props(view.sidebar)}><slot name="sidebar"></slot></aside>
          <div ${props(view.content)}><slot></slot></div>
        </div>
      </div>
    `;
  }
}

if (typeof document !== 'undefined' && document.head) installLightStyles(SHELL_SCOPE, shellScopedStyles);

if (!customElements.get('mp-shell')) {
  customElements.define('mp-shell', MpShell);
}
