import { html, nothing } from 'lit';
import { MpDropdownElement } from './mp-dropdown-element';
import { dropdownMenuStyles } from '../styles';
import type { DropdownMode, DropdownSelectEventDetail } from '../types';

/**
 * `<mp-dropdown-menu>` — a Bootstrap `.dropdown-menu` rendered inside its shadow
 * root, with theme-aware styling that follows the page theme across the shadow
 * boundary (no `data-bs-theme` selector needed inside — see
 * `dropdown-menu.styles.scss`). Purely presentational: it has no trigger or
 * positioning of its own (that is the `mp-navbar-dropdown` / standalone trigger
 * behaviour layer); the menu flows in place and is always shown.
 *
 * Children are **plain light-DOM elements** carrying Bootstrap classes — there
 * is no per-item web component. The item box, divider and header are styled by
 * `::slotted(.dropdown-item|.dropdown-divider|.dropdown-header)` in this shadow
 * (see the stylesheet); a nested `<a>`/`<button>` inside an item is the one thing
 * `::slotted` can't reach and is handled by the companion light-DOM sheet each
 * framework wrapper ships. In Angular the classes come from the `[bsDropdownItem]`
 * / `[bsDropdownDivider]` / `[bsDropdownHeader]` attribute directives.
 *
 * In `menu` mode (default) the menu provides roving-tabindex keyboard navigation
 * (Arrow keys / Home / End) over the enabled items and assigns `role="menuitem"`
 * to each item's interactive control. In `listbox` mode it assigns `role="option"`
 * + `aria-selected` and leaves focus management to the consumer.
 *
 * Attributes:
 *  - `mode` — `menu` (default) | `listbox`.
 *  - `max-height` — px cap; maps to `--mp-dropdown-max-height` (scrolls beyond).
 *  - `label-id` — id of an external label, set as `aria-labelledby` on the list.
 *
 * An item is disabled via the `.disabled` class (or `aria-disabled="true"`), and
 * carries an opaque `value` via a `value` JS property or a `data-value` attribute.
 * Events: `select` (`detail: { item, value }`) when an enabled item is activated.
 */
export class MpDropdownMenu extends MpDropdownElement {
  static override styles = [dropdownMenuStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'mode', 'max-height', 'label-id'];
  }

  /** Index (into the item list) holding the roving tabindex in menu mode. */
  #focusedIndex = 0;

  // `mode`/`labelId` reflect to attributes (the layout/roles read the attribute).
  // Setters matter for `@lit/react`'s createComponent, which sets matching props.
  get mode(): DropdownMode {
    return this.getAttribute('mode') === 'listbox' ? 'listbox' : 'menu';
  }
  set mode(v: DropdownMode) {
    if (v) this.setAttribute('mode', v);
    else this.removeAttribute('mode');
  }

  get labelId(): string | null {
    return this.getAttribute('label-id');
  }
  set labelId(v: string | null) {
    if (v) this.setAttribute('label-id', v);
    else this.removeAttribute('label-id');
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.#onClick);
    this.addEventListener('keydown', this.#onKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.#onClick);
    this.removeEventListener('keydown', this.#onKeydown);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'max-height') {
      if (newValue) this.style.setProperty('--mp-dropdown-max-height', `${newValue}px`);
      else this.style.removeProperty('--mp-dropdown-max-height');
    } else if (name === 'mode' || name === 'label-id') {
      // `mode`/`label-id` are read in render(); re-render and re-sync item roles.
      this.requestUpdate();
      this.#syncItems();
    }
  }

  protected override firstUpdated(): void {
    this.#syncItems();
  }

  // --- item bookkeeping ------------------------------------------------------

  /**
   * The interactive items (the `.dropdown-item` elements), in DOM order, scoped
   * to THIS menu. Queries the light-DOM subtree — items are plain light-DOM
   * `<li class="dropdown-item">` (Angular's `[bsDropdownItem]` adds no host
   * element). Items belonging to a nested `<mp-dropdown-menu>` (navbar submenus)
   * are excluded so this menu only manages its own.
   */
  #items(): HTMLElement[] {
    return Array.from(this.querySelectorAll<HTMLElement>('.dropdown-item')).filter(
      (el) => el.closest('mp-dropdown-menu') === this,
    );
  }

  /** The focusable control for an item — its first `<a>`/`<button>`, else itself. */
  #controlOf(item: HTMLElement): HTMLElement {
    return item.querySelector<HTMLElement>('a, button') ?? item;
  }

  #isDisabled(item: HTMLElement): boolean {
    return item.classList.contains('disabled') || item.getAttribute('aria-disabled') === 'true';
  }

  #valueOf(item: HTMLElement): unknown {
    const prop = (item as HTMLElement & { value?: unknown }).value;
    return prop !== undefined ? prop : item.dataset['value'];
  }

  #onSlotChange = (): void => {
    this.#syncItems();
  };

  /** Assign roles, aria, and the roving tabindex across the current items. */
  #syncItems(): void {
    const items = this.#items();
    if (items.length === 0) return;

    // Keep the roving index on an enabled item.
    if (!items[this.#focusedIndex] || this.#isDisabled(items[this.#focusedIndex])) {
      const firstEnabled = items.findIndex((it) => !this.#isDisabled(it));
      this.#focusedIndex = firstEnabled >= 0 ? firstEnabled : 0;
    }

    const listbox = this.mode === 'listbox';
    items.forEach((item, i) => {
      const control = this.#controlOf(item);
      // The <li> is presentational when a real control carries the role.
      if (control !== item) item.setAttribute('role', 'presentation');
      control.setAttribute('role', listbox ? 'option' : 'menuitem');
      const disabled = this.#isDisabled(item);
      if (listbox) control.setAttribute('aria-selected', item.classList.contains('active') ? 'true' : 'false');
      else control.removeAttribute('aria-selected');
      if (disabled) control.setAttribute('aria-disabled', 'true');
      else control.removeAttribute('aria-disabled');
      // Roving tabindex only in menu mode; listbox consumers manage activedescendant.
      const tabbable = !listbox && i === this.#focusedIndex && !disabled;
      control.setAttribute('tabindex', tabbable ? '0' : '-1');
    });
  }

  // --- keyboard (menu mode) --------------------------------------------------

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.mode !== 'menu') return;
    switch (event.key) {
      case 'ArrowDown':
        this.#move(1);
        event.preventDefault();
        break;
      case 'ArrowUp':
        this.#move(-1);
        event.preventDefault();
        break;
      case 'Home':
        this.#moveTo(this.#items().findIndex((it) => !this.#isDisabled(it)));
        event.preventDefault();
        break;
      case 'End': {
        const items = this.#items();
        for (let i = items.length - 1; i >= 0; i--) {
          if (!this.#isDisabled(items[i])) {
            this.#moveTo(i);
            break;
          }
        }
        event.preventDefault();
        break;
      }
    }
  };

  #move(delta: 1 | -1): void {
    const items = this.#items();
    const total = items.length;
    if (total === 0) return;
    let cursor = this.#focusedIndex;
    for (let n = 0; n < total; n++) {
      cursor = (cursor + delta + total) % total;
      if (!this.#isDisabled(items[cursor])) {
        this.#moveTo(cursor);
        return;
      }
    }
  }

  #moveTo(index: number): void {
    const items = this.#items();
    if (index < 0 || index >= items.length) return;
    this.#focusedIndex = index;
    this.#syncItems();
    this.#controlOf(items[index]).focus();
  }

  // --- activation ------------------------------------------------------------

  #onClick = (event: MouseEvent): void => {
    const item = event
      .composedPath()
      .find(
        (el): el is HTMLElement =>
          el instanceof HTMLElement && el.classList.contains('dropdown-item'),
      );
    if (!item || this.#isDisabled(item) || item.closest('mp-dropdown-menu') !== this) return;
    this.dispatchEvent(
      new CustomEvent<DropdownSelectEventDetail>('select', {
        detail: { item, value: this.#valueOf(item) },
        bubbles: true,
        composed: true,
      }),
    );
  };

  override render() {
    return html`
      <ul
        class="dropdown-menu show"
        role=${this.mode}
        part="menu"
        aria-labelledby=${this.labelId ?? nothing}
      >
        <slot @slotchange=${this.#onSlotChange}></slot>
      </ul>
    `;
  }
}

if (!customElements.get('mp-dropdown-menu')) {
  customElements.define('mp-dropdown-menu', MpDropdownMenu);
}
