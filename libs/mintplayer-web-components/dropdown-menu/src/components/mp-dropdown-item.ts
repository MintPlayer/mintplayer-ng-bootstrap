import { html } from 'lit';
import { MpDropdownElement } from './mp-dropdown-element';
import { dropdownItemStyles } from '../styles';

/**
 * `<mp-dropdown-item>` — a Bootstrap `.dropdown-item` for use inside
 * `<mp-dropdown-menu>`. The host element is the focusable/interactive node: the
 * parent menu assigns its `role` and roving `tabindex`, and styling for the
 * `selected` / `disabled` states is driven by reflected host attributes (so the
 * DSD chrome stays static — no re-render on state change).
 *
 * Activation: a click (or Enter / Space, which forward to a synthetic click)
 * bubbles to the menu, which dispatches the `select` event. The item's `value`
 * property (opaque) is carried in that event's detail.
 *
 * Attributes:
 *  - `selected` — current/active item (Bootstrap `.active` appearance; in a
 *    `listbox` menu also drives `aria-selected`).
 *  - `disabled` — non-interactive, removed from the roving order.
 */
export class MpDropdownItem extends MpDropdownElement {
  static override styles = [dropdownItemStyles];

  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'selected', 'disabled'];
  }

  /**
   * Opaque value carried in the menu's `select` event detail. Set the property
   * directly for non-string values (wrappers do this); otherwise it falls back
   * to the `value` attribute so plain-HTML / no-JS authoring (`value="a"`) works.
   */
  #value: unknown = undefined;
  get value(): unknown {
    return this.#value !== undefined ? this.#value : this.getAttribute('value') ?? undefined;
  }
  set value(v: unknown) {
    this.#value = v;
  }

  get selected(): boolean {
    return this.hasAttribute('selected');
  }
  set selected(v: boolean) {
    this.toggleAttribute('selected', v);
  }

  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }
  set disabled(v: boolean) {
    this.toggleAttribute('disabled', v);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.#onKeydown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.#onKeydown);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    if (name === 'disabled') {
      // Reflect for AT even before the parent menu syncs roles.
      if (newValue !== null) this.setAttribute('aria-disabled', 'true');
      else this.removeAttribute('aria-disabled');
    }
  }

  #onKeydown = (event: KeyboardEvent): void => {
    if (this.disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault();
      this.click();
    }
  };

  override render() {
    return html`<div class="dropdown-item" part="item"><slot></slot></div>`;
  }
}

if (!customElements.get('mp-dropdown-item')) {
  customElements.define('mp-dropdown-item', MpDropdownItem);
}
