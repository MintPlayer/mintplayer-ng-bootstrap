import { LitElement, html, nothing, type TemplateResult } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { createRef, ref, type Ref } from 'lit/directives/ref.js';

// `formSelectStyles` is the codegen-wc output of `_styles/form-select.styles.scss`.
// Lives outside the per-entry tree at libs/.../_styles/ — internal helper, not
// a public sub-entry of @mintplayer/web-components.
import { formSelectStyles } from '../../../_styles/form-select.styles';

export type MpSelectSize = 'sm' | 'md' | 'lg';

export interface MpSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectChangeEventDetail {
  value: string | null;
  values: string[];
}

const VALID_SIZES: ReadonlySet<MpSelectSize> = new Set(['sm', 'md', 'lg']);

/**
 * `<mp-select>` — Bootstrap-styled native `<select>` wrapped in a Lit element.
 *
 * Two input modes (mutually exclusive — `.options` wins when set):
 *
 * 1. **Programmatic** — set the `.options` JS property to an array of
 *    `{ value, label, disabled? }`. The element renders the shadow
 *    `<select>` directly from that array.
 *
 * 2. **Slotted** — place `<option>` (and optional `<optgroup>`) children in
 *    light DOM. On `slotchange` the element mirrors them into the shadow
 *    `<select>`; a `MutationObserver` re-mirrors when attributes or text
 *    content change. This is the mode the Angular `bs-select` wrapper uses
 *    so existing `[(ngModel)]` + `<option [ngValue]>` templates keep working.
 *
 * The WC value-space is always a **string** — object identity (the
 * `compareWith` use-case from the Angular value accessor) is handled one
 * layer up by `BsSelectValueAccessor`, which maps objects to stable string
 * ids via an internal `optionMap`. The WC does not need to know about
 * objects.
 *
 * Emits `value-change` with `detail: { value, values }`. Also re-dispatches
 * a `composed: true` `change` event so consumers using the native event
 * name continue to fire.
 */
export class MpSelect extends LitElement {
  static override styles = [formSelectStyles];

  static override shadowRootOptions = {
    ...LitElement.shadowRootOptions,
    delegatesFocus: true,
  };

  static override get observedAttributes(): string[] {
    return [
      ...(super.observedAttributes ?? []),
      'size',
      'multiple',
      'number-visible',
      'disabled',
      'value',
      'aria-label',
    ];
  }

  private _size: MpSelectSize = 'md';
  private _multiple = false;
  private _numberVisible: number | null = null;
  private _disabled = false;
  private _value: string | null = null;
  private _values: string[] = [];
  private _options: MpSelectOption[] | null = null;
  private _slotOptions: MpSelectOption[] = [];
  private readonly _selectRef: Ref<HTMLSelectElement> = createRef();
  private _slotObserver: MutationObserver | null = null;

  get size(): MpSelectSize {
    return this._size;
  }
  set size(value: MpSelectSize) {
    if (!VALID_SIZES.has(value) || this._size === value) return;
    this._size = value;
    this.requestUpdate();
  }

  get multiple(): boolean {
    return this._multiple;
  }
  set multiple(value: boolean) {
    const next = !!value;
    if (this._multiple === next) return;
    this._multiple = next;
    this.reflectBoolean('multiple', next);
    this.requestUpdate();
  }

  get numberVisible(): number | null {
    return this._numberVisible;
  }
  set numberVisible(value: number | null) {
    const next = value == null ? null : Number(value);
    if (this._numberVisible === next) return;
    this._numberVisible = next;
    this.requestUpdate();
  }

  get disabled(): boolean {
    return this._disabled;
  }
  set disabled(value: boolean) {
    const next = !!value;
    if (this._disabled === next) return;
    this._disabled = next;
    this.reflectBoolean('disabled', next);
    this.requestUpdate();
  }

  get value(): string | null {
    return this._value;
  }
  set value(value: string | null) {
    const next = value ?? null;
    if (this._value === next) return;
    this._value = next;
    this.requestUpdate();
  }

  get values(): string[] {
    return [...this._values];
  }
  set values(value: string[]) {
    const next = Array.isArray(value) ? [...value] : [];
    this._values = next;
    if (next.length > 0) this._value = next[0];
    this.requestUpdate();
  }

  get options(): MpSelectOption[] | null {
    return this._options;
  }
  set options(value: MpSelectOption[] | null) {
    this._options = value;
    this.requestUpdate();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    switch (name) {
      case 'size':
        if (newValue && VALID_SIZES.has(newValue as MpSelectSize)) {
          this._size = newValue as MpSelectSize;
          this.requestUpdate();
        }
        break;
      case 'multiple':
        this._multiple = newValue !== null;
        this.requestUpdate();
        break;
      case 'number-visible':
        this._numberVisible = newValue == null ? null : Number(newValue);
        this.requestUpdate();
        break;
      case 'disabled':
        this._disabled = newValue !== null;
        this.requestUpdate();
        break;
      case 'value':
        this._value = newValue;
        this.requestUpdate();
        break;
      case 'aria-label':
        // Re-render so the inner <select> picks up the new value via
        // `this.getAttribute('aria-label')` in render().
        this.requestUpdate();
        break;
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._slotObserver?.disconnect();
    this._slotObserver = null;
  }

  override render(): TemplateResult {
    const effective = this._options ?? this._slotOptions;
    const sizeClass = this._size === 'sm' || this._size === 'lg'
      ? `form-select form-select-${this._size}`
      : 'form-select';
    const ariaLabel = this.getAttribute('aria-label');
    return html`
      <select
        ${ref(this._selectRef)}
        class=${sizeClass}
        ?multiple=${this._multiple}
        ?disabled=${this._disabled}
        size=${ifDefined(this._numberVisible ?? undefined)}
        aria-label=${ariaLabel ?? nothing}
        @change=${this.onNativeChange}
      >
        ${effective.map(
          (o) => html`
            <option
              value=${o.value}
              ?selected=${this.isSelected(o.value)}
              ?disabled=${!!o.disabled}
            >${o.label}</option>
          `,
        )}
      </select>
      <slot hidden @slotchange=${this.onSlotChange}></slot>
    `;
  }

  // The native `<select>` resets its `selectedIndex` on every full re-render
  // because we recreate `<option>` nodes. Restore the selection from
  // `_value`/`_values` after each Lit commit. Skips when no element yet
  // exists (initial render) — render() already marks the matching option
  // with `?selected`.
  protected override updated(): void {
    const select = this._selectRef.value;
    if (!select) return;
    if (this._multiple) {
      Array.from(select.options).forEach((opt) => {
        opt.selected = this._values.includes(opt.value);
      });
    } else if (this._value != null) {
      select.value = this._value;
    }
  }

  private isSelected(optionValue: string): boolean {
    return this._multiple
      ? this._values.includes(optionValue)
      : this._value === optionValue;
  }

  private onSlotChange = (ev: Event): void => {
    const slot = ev.target as HTMLSlotElement;
    const assigned = slot.assignedElements({ flatten: true });
    this._slotOptions = assigned
      .filter((el): el is HTMLOptionElement => el.tagName === 'OPTION')
      .map((opt) => ({
        value: opt.value,
        label: opt.textContent?.trim() ?? '',
        disabled: opt.disabled,
      }));
    this.observeSlottedMutations(assigned);
    this.requestUpdate();
  };

  // Slotted `<option>` elements can have their `value` attribute or text
  // content updated dynamically (e.g., the Angular `BsSelectOption`
  // directive sets `value` from `[ngValue]` after the initial render). A
  // MutationObserver re-runs the slot mirror on any such mutation.
  private observeSlottedMutations(elements: Element[]): void {
    this._slotObserver?.disconnect();
    if (elements.length === 0) {
      this._slotObserver = null;
      return;
    }
    this._slotObserver = new MutationObserver(() => this.refreshSlotOptions());
    elements.forEach((el) => {
      this._slotObserver!.observe(el, {
        attributes: true,
        characterData: true,
        childList: true,
        subtree: true,
      });
    });
  }

  private refreshSlotOptions(): void {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;
    const assigned = slot.assignedElements({ flatten: true });
    this._slotOptions = assigned
      .filter((el): el is HTMLOptionElement => el.tagName === 'OPTION')
      .map((opt) => ({
        value: opt.value,
        label: opt.textContent?.trim() ?? '',
        disabled: opt.disabled,
      }));
    this.requestUpdate();
  }

  private onNativeChange = (ev: Event): void => {
    const select = ev.target as HTMLSelectElement;
    if (this._multiple) {
      this._values = Array.from(select.selectedOptions).map((o) => o.value);
      this._value = this._values[0] ?? null;
    } else {
      this._value = select.value || null;
      this._values = this._value == null ? [] : [this._value];
    }
    this.dispatchEvent(
      new CustomEvent<SelectChangeEventDetail>('value-change', {
        detail: { value: this._value, values: [...this._values] },
        bubbles: true,
        composed: true,
      }),
    );
    // Native `change` from a shadow `<select>` is composed:false; re-dispatch
    // a composed copy so consumers binding `@change` on the host element see it.
    this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  };

  private reflectBoolean(attr: string, value: boolean): void {
    if (value) this.setAttribute(attr, '');
    else this.removeAttribute(attr);
  }
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-select')) {
  customElements.define('mp-select', MpSelect);
}
