import { ReactiveElement } from 'lit';
import { installLightStyles } from '@mintplayer/web-components/light-dom';
import { applyHostProps, EMPTY_HOST_PROPS } from '@mintplayer/web-components/machine';
import {
  DROPDOWN_MENU_SCOPE,
  attachDropdownMenu,
  connectDropdownMenu,
  dropdownMenuScopedStyles,
  type DropdownSelectEventDetail,
} from '@mintplayer/ui-core/dropdown-menu';

/** The consumer names the menu on the element itself; the bag must not overwrite it. */
const NAMING = new Set(['aria-label', 'aria-labelledby']);

/**
 * `<mp-dropdown-menu>` — the Lit front of the dropdown menu (#437). The
 * element itself is the Bootstrap `.dropdown-menu`, in the light DOM, and its
 * children are the items, exactly as the other fronts render them:
 *
 *     <mp-dropdown-menu aria-label="Actions">
 *       <li class="dropdown-header">Section</li>
 *       <li class="dropdown-item"><a href="/a">First</a></li>
 *       <li class="dropdown-divider"></li>
 *       <li class="dropdown-item" data-value="b"><button type="button">Second</button></li>
 *     </mp-dropdown-menu>
 *
 * Once connected, the core's attachment adds `role=menu`, the menuitem roles,
 * the roving tabindex, the arrow keys and the `select` event. It has no trigger
 * or positioning of its own; the menu flows in place, shown.
 *
 * Name it with `aria-label` or `aria-labelledby` on the element: it is the
 * role-bearing node, so both apply directly.
 *
 * Tier: JS-only. Server-rendered pages use a framework front, whose output is
 * a plain list of links until hydrated.
 *
 * Attributes: `max-height` (px; the menu scrolls beyond).
 * Events: `select` (`detail: { item, value }`) when an enabled item is activated.
 */
export class MpDropdownMenu extends ReactiveElement {
  static override properties = { maxHeight: { type: Number, attribute: 'max-height' } };

  declare maxHeight: number | null;
  #host = EMPTY_HOST_PROPS;
  #dispose: (() => void) | null = null;

  constructor() {
    super();
    this.maxHeight = null;
  }

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#dispose = attachDropdownMenu(this, {
      onSelect: (detail) =>
        this.dispatchEvent(new CustomEvent<DropdownSelectEventDetail>('select', { detail, bubbles: true, composed: true })),
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#dispose?.();
    this.#dispose = null;
  }

  protected override update(changed: Map<string, unknown>): void {
    super.update(changed);
    // Naming stays the consumer's: the element is the role-bearing node.
    const bag = Object.fromEntries(Object.entries(connectDropdownMenu({ hydrated: true })).filter(([name]) => !NAMING.has(name)));
    this.#host = applyHostProps(this, this.#host, { ...bag, 'data-mps': DROPDOWN_MENU_SCOPE });
    if (this.maxHeight) this.style.setProperty('--mp-dropdown-max-height', `${this.maxHeight}px`);
    else this.style.removeProperty('--mp-dropdown-max-height');
  }
}

if (typeof document !== 'undefined' && document.head) {
  installLightStyles(DROPDOWN_MENU_SCOPE, dropdownMenuScopedStyles);
}

if (!customElements.get('mp-dropdown-menu')) {
  customElements.define('mp-dropdown-menu', MpDropdownMenu);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-dropdown-menu': MpDropdownMenu;
  }
}
