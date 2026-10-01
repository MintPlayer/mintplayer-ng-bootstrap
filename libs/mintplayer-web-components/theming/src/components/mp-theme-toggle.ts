import { LitElement, html, nothing, svg, type TemplateResult } from 'lit';
import { LiveAnnouncerController } from '@mintplayer/web-components/a11y';
import { isValidThemeMode } from '../cookie';
import { getBsThemeStore } from '../store';
import { BS_THEME_DEFAULT_MODES, type BsThemeToggleMode } from '../toggle-modes';
import { themeToggleStyles } from '../styles/theme-toggle.styles';

const DESCRIPTION_ID = 'current-theme';

/** True only where the theme store can exist. Deliberately not lit's `isServer` (true under vitest). */
function hasBrowserDocument(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined' && !!document.documentElement;
}

function warnDropped(entry: unknown): void {
  // eslint-disable-next-line no-console
  console.warn(
    '[mp-theme-toggle] dropped a modes entry: its mode must match /^[a-z0-9-]{1,32}$/i.',
    entry,
  );
}

function warnEmpty(): void {
  // eslint-disable-next-line no-console
  console.warn('[mp-theme-toggle] modes has no usable entry; falling back to BS_THEME_DEFAULT_MODES.');
}

function isUsableEntry(entry: unknown): entry is BsThemeToggleMode {
  return !!entry && typeof entry === 'object' && isValidThemeMode((entry as BsThemeToggleMode).mode);
}

/**
 * `<mp-theme-toggle>` — a button that cycles the document's colour mode
 * through a list of modes (PRD dark-mode D7).
 *
 * Tier: shadow (it mounts no consumer DOM). no-JS: none (control requires
 * script). There is no DSD chrome and nothing in codegen-ssr-chrome: a toggle
 * cannot work without script and must never render enabled when it cannot
 * function. No-JS visitors still get OS-following colours from the pre-boot
 * script and the stylesheet. `color-mode.css` reserves the element's 1.5em box
 * before it upgrades, so defining it causes no layout shift.
 *
 * State lives in the theme store (`getBsThemeStore()`), never here: the element
 * subscribes on connect, unsubscribes on disconnect, and a click calls
 * `setMode()`. Anything else that changes the mode (a framework service, another
 * tab) re-renders it.
 *
 * `modes` (property only, default `BS_THEME_DEFAULT_MODES`) is the cycle, in
 * array order. Entries whose `mode` fails `isValidThemeMode` are dropped with a
 * warning; `null`, `undefined`, or a list with no usable entry falls back to
 * the default, so the control is never left with nothing to cycle. A current mode that is not in the list shows entry 0 and cycles to
 * entry 1. More than about three modes wants a menu (radio group) instead.
 *
 * Accessibility:
 *  - a native `<button type="button">`: Enter and Space cycle, no custom keymap;
 *  - its name is the NEXT entry's `label` (the action);
 *  - `aria-describedby` points at a visually hidden node in this shadow root
 *    holding the CURRENT entry's `announcement`, rewritten in the same render;
 *  - after a click the new entry's `announcement` goes out once through a
 *    polite live region (transient), while the description stays re-readable;
 *  - the icon is `aria-hidden` and `focusable="false"`.
 */
export class MpThemeToggle extends LitElement {
  static override styles = [themeToggleStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  private _modes: readonly BsThemeToggleMode[] = BS_THEME_DEFAULT_MODES;
  /** The store's mode, mirrored for rendering. `null` until connected in a browser. */
  private _currentMode: string | null = null;
  private _unsubscribe: (() => void) | null = null;
  private readonly _announcer = new LiveAnnouncerController(this, { politeness: 'polite' });

  /** The cycle, in order. Property only: it has no attribute form. */
  get modes(): readonly BsThemeToggleMode[] {
    return this._modes;
  }

  /**
   * `null`/`undefined` resets to `BS_THEME_DEFAULT_MODES`. So does a list with no
   * usable entry (empty, or every entry invalid), with a warning: a toggle with
   * zero modes would be a broken control.
   */
  set modes(value: readonly BsThemeToggleMode[] | null | undefined) {
    if (value === null || value === undefined) {
      this._modes = BS_THEME_DEFAULT_MODES;
      this.requestUpdate();
      return;
    }
    const list = Array.isArray(value) ? (value as readonly unknown[]) : [];
    list.filter((entry) => !isUsableEntry(entry)).map(warnDropped);
    const usable = list.filter(isUsableEntry);
    if (usable.length === 0) warnEmpty();
    this._modes = usable.length > 0 ? usable : BS_THEME_DEFAULT_MODES;
    this.requestUpdate();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!hasBrowserDocument()) return;
    const store = getBsThemeStore();
    this._unsubscribe = store.subscribe(() => this._syncFromStore());
    this._syncFromStore();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  private _syncFromStore(): void {
    const next = getBsThemeStore().getMode();
    if (next === this._currentMode) return;
    this._currentMode = next;
    this.requestUpdate();
  }

  /** Index of the current mode in `modes`, or -1 when it is not in the list. */
  private _currentIndex(): number {
    const current = this._currentMode?.toLowerCase() ?? null;
    return this._modes.findIndex((entry) => entry.mode.toLowerCase() === current);
  }

  private _entries(): { current: BsThemeToggleMode; next: BsThemeToggleMode } | null {
    const count = this._modes.length;
    if (count === 0) return null;
    const index = this._currentIndex();
    // Not in the list: show entry 0, cycle to entry 1 (entry 0 again for a one-entry list).
    const currentIndex = index < 0 ? 0 : index;
    return { current: this._modes[currentIndex], next: this._modes[(currentIndex + 1) % count] };
  }

  private _onClick(): void {
    const entries = this._entries();
    if (!entries || !hasBrowserDocument()) return;
    getBsThemeStore().setMode(entries.next.mode);
    // The store notifies synchronously; re-read in case the mode was already set
    // (setMode renews the cookie but does not notify for an unchanged mode).
    this._syncFromStore();
    this._announcer.announce(entries.next.announcement);
  }

  private _renderIcon(icon: string | readonly string[]): TemplateResult {
    const paths = typeof icon === 'string' ? [icon] : [...icon];
    return html`<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">${paths.map(
      (d) => svg`<path d=${d}></path>`,
    )}</svg>`;
  }

  protected override render(): TemplateResult | typeof nothing {
    const entries = this._entries();
    if (!entries) return nothing;
    const { current, next } = entries;
    return html`
      <button
        type="button"
        aria-label=${next.label}
        aria-describedby=${DESCRIPTION_ID}
        @click=${this._onClick}
      >${this._renderIcon(current.icon)}</button>
      <span id=${DESCRIPTION_ID} class="visually-hidden">${current.announcement}</span>
      ${this._announcer.template()}
    `;
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-theme-toggle')) {
  customElements.define('mp-theme-toggle', MpThemeToggle);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-theme-toggle': MpThemeToggle;
  }
}
