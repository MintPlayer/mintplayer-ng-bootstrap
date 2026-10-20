import { LitElement } from 'lit';
import { connectRadioGroup, radioGroupName } from '@mintplayer/ui-core/radio';
import type { MpRadio } from '@mintplayer/web-components/radio';

// Side-effect: the group is meaningless without its radios.
import '@mintplayer/web-components/radio';

export interface RadioGroupChangeEventDetail {
  value: string | null;
}

let instanceCounter = 0;

/**
 * `<mp-radio-group>` — the Lit front of a radio group (#437): a light-DOM
 * container with `role="radiogroup"` that hands its `<mp-radio>` descendants
 * one `name`. They are then native radios of one set in one document, so the
 * browser supplies exclusivity, the single tab stop, arrow move-and-select,
 * posinset/setsize and form submission (each checked input submits itself),
 * with JavaScript off as well. Name it with `aria-label` / `aria-labelledby`.
 *
 * Attributes: `name` (generated when omitted), `required`, `disabled` — both
 * reach every radio. Emits `group-change` with `detail: { value }` when the
 * user picks a radio, by pointer or keyboard.
 */
export class MpRadioGroup extends LitElement {
  static override get observedAttributes(): string[] {
    return [...(super.observedAttributes ?? []), 'name', 'required', 'disabled'];
  }

  private readonly _rootId = `mp-radio-group-${++instanceCounter}`;

  protected override createRenderRoot(): HTMLElement {
    return this;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('change', this.onRadioChange);
    this.syncHost();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('change', this.onRadioChange);
  }

  override attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    super.attributeChangedCallback(name, oldValue, newValue);
    this.syncHost();
    // The radios read name / required / disabled from the group in their render.
    this.radios().map((radio) => radio.requestUpdate());
  }

  /** The name every radio of the group carries. */
  get groupName(): string {
    return this.getAttribute('name') ?? radioGroupName(this._rootId);
  }

  get name(): string | null {
    return this.getAttribute('name');
  }
  set name(value: string | null) {
    if (value === null) this.removeAttribute('name');
    else this.setAttribute('name', value);
  }

  get value(): string | null {
    return this.radios().find((radio) => radio.checked)?.value ?? null;
  }
  set value(next: string | null) {
    this.radios().map((radio) => (radio.checked = next !== null && radio.value === next));
  }

  /** The group's radios, excluding any nested group's. */
  private radios(): MpRadio[] {
    return [...this.querySelectorAll<MpRadio>('mp-radio')].filter(
      (radio) => radio.closest('mp-radio-group') === this,
    );
  }

  private syncHost(): void {
    const attrs = connectRadioGroup({
      required: this.hasAttribute('required'),
      disabled: this.hasAttribute('disabled'),
    });
    Object.entries(attrs).map(([key, value]) =>
      value === null || value === undefined ? this.removeAttribute(key) : this.setAttribute(key, String(value)),
    );
  }

  private onRadioChange = (event: Event): void => {
    const target = event.target as Element;
    if (target.localName !== 'mp-radio' || target.closest('mp-radio-group') !== this) return;
    this.dispatchEvent(
      new CustomEvent<RadioGroupChangeEventDetail>('group-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  };
}

if (typeof customElements !== 'undefined' && !customElements.get('mp-radio-group')) {
  customElements.define('mp-radio-group', MpRadioGroup);
}

declare global {
  interface HTMLElementTagNameMap {
    'mp-radio-group': MpRadioGroup;
  }
}
