import { html, nothing } from 'lit';
import { MpDropdownElement } from './mp-dropdown-element';
import { MpDropdownItem } from './mp-dropdown-item';
import { dropdownMenuStyles } from '../styles';
import type { DropdownMode, DropdownSelectEventDetail } from '../types';

/**
 * `<mp-dropdown-menu>` — a Bootstrap `.dropdown-menu` rendered inside its shadow
 * root, with theme-aware styling that follows the page theme across the shadow
 * boundary (no `data-bs-theme` selector needed inside — see
 * `dropdown-menu.styles.scss`). Purely presentational: it has no trigger or
 * positioning of its own (that is a future `mp-dropdown` behaviour layer); the
 * menu flows in place and is always shown.
 *
 * Slot `<mp-dropdown-item>` / `<mp-dropdown-divider>` / `<mp-dropdown-header>`
 * children. In `menu` mode (default) the menu provides roving-tabindex keyboard
 * navigation (Arrow keys / Home / End) over the enabled items and assigns their
 * `role="menuitem"`. In `listbox` mode it assigns `role="option"` +
 * `aria-selected` and leaves focus management to the consumer.
 *
 * Attributes:
 *  - `mode` — `menu` (default) | `listbox`.
 *  - `max-height` — px cap; maps to `--mp-dropdown-max-height` (scrolls beyond).
 *  - `label-id` — id of an external label, set as `aria-labelledby` on the list.
 *
 * Events: `select` (`detail: { item, value }`) when an enabled item is activated.
 */
export class MpDropdownMenu extends MpDropdownElement {
  static override styles = [dropdownMenuStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'mode', 'max-height', 'label-id'];
  }

  /** Index (into the full item list) holding the roving tabindex in menu mode. */
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
   * The interactive items (excludes dividers/headers), in DOM order. Queries the
   * light-DOM subtree rather than only the slot's directly-assigned elements: a
   * framework wrapper — notably Angular, whose components always emit a host
   * element — nests `<mp-dropdown-item>` inside its own tag, so the slot assigns
   * the wrapper, not the item. `querySelectorAll` finds the items in document
   * order however deeply a wrapper nests them. (No submenus in this component, so
   * there is no nested-menu subtree to exclude.)
   */
  #items(): MpDropdownItem[] {
    return Array.from(this.querySelectorAll('mp-dropdown-item')) as MpDropdownItem[];
  }

  #onSlotChange = (): void => {
    this.#syncItems();
  };

  /** Assign roles, aria, and the roving tabindex across the current items. */
  #syncItems(): void {
    const items = this.#items();
    if (items.length === 0) return;

    // Keep the roving index on an enabled item.
    if (!items[this.#focusedIndex] || items[this.#focusedIndex].disabled) {
      const firstEnabled = items.findIndex((it) => !it.disabled);
      this.#focusedIndex = firstEnabled >= 0 ? firstEnabled : 0;
    }

    const listbox = this.mode === 'listbox';
    items.forEach((it, i) => {
      it.setAttribute('role', listbox ? 'option' : 'menuitem');
      if (listbox) it.setAttribute('aria-selected', it.selected ? 'true' : 'false');
      else it.removeAttribute('aria-selected');
      // Roving tabindex only in menu mode; listbox consumers manage activedescendant.
      const tabbable = !listbox && i === this.#focusedIndex && !it.disabled;
      it.setAttribute('tabindex', tabbable ? '0' : '-1');
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
        this.#moveTo(this.#items().findIndex((it) => !it.disabled));
        event.preventDefault();
        break;
      case 'End': {
        const items = this.#items();
        for (let i = items.length - 1; i >= 0; i--) {
          if (!items[i].disabled) {
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
      if (!items[cursor].disabled) {
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
    items[index].focus();
  }

  // --- activation ------------------------------------------------------------

  #onClick = (event: MouseEvent): void => {
    const item = event
      .composedPath()
      .find(
        (el): el is MpDropdownItem =>
          el instanceof HTMLElement && el.localName === 'mp-dropdown-item',
      );
    if (!item || item.disabled) return;
    this.dispatchEvent(
      new CustomEvent<DropdownSelectEventDetail>('select', {
        detail: { item, value: item.value },
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
